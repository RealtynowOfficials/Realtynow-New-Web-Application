-- =============================================================================
-- Migration: 20260726120000_0040_agent_wallets_commissions.sql
-- Description: Implement Agent Wallets, Commissions, and Withdrawal Requests
-- =============================================================================

-- ============================================================
-- 1. WALLETS (For Agents & Users to hold credits/balances)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance        NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'INR',
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'frozen')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallets_own" ON public.wallets;
CREATE POLICY "wallets_own" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "wallets_admin" ON public.wallets;
CREATE POLICY "wallets_admin" ON public.wallets
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-create wallet on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Create wallets for existing users
INSERT INTO public.wallets (user_id)
SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 2. WALLET TRANSACTIONS (Ledger)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description     TEXT,
  reference_id    UUID, -- Can be a payment_id, invoice_id, or commission_id
  reference_type  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_tx_own" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_own" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()) OR public.is_staff());

DROP POLICY IF EXISTS "wallet_tx_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_admin" ON public.wallet_transactions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 3. COMMISSIONS (For Sales Persons & Affiliate Agents)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_person_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id       UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount           NUMERIC(12,2) NOT NULL,
  percentage       NUMERIC(5,2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_own" ON public.commissions;
CREATE POLICY "commissions_own" ON public.commissions
  FOR SELECT TO authenticated USING (auth.uid() = sales_person_id OR public.is_staff());

DROP POLICY IF EXISTS "commissions_admin" ON public.commissions;
CREATE POLICY "commissions_admin" ON public.commissions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 4. WITHDRAWAL REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id       UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  bank_details    JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  processed_at    TIMESTAMPTZ,
  admin_notes     TEXT,
  transaction_ref TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_own" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_own" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "withdrawals_insert" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_insert" ON public.withdrawal_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "withdrawals_admin" ON public.withdrawal_requests;
CREATE POLICY "withdrawals_admin" ON public.withdrawal_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 5. TRIGGERS & RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_wallets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER on_wallets_updated_at
  BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.handle_wallets_updated_at();

CREATE TRIGGER on_commissions_updated_at
  BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.handle_wallets_updated_at();

CREATE TRIGGER on_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.handle_wallets_updated_at();

-- RPC to request a withdrawal securely
CREATE OR REPLACE FUNCTION public.fn_request_withdrawal(
  p_amount NUMERIC,
  p_bank_details JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
BEGIN
  -- Get user wallet
  SELECT id, balance INTO v_wallet_id, v_balance 
  FROM public.wallets 
  WHERE user_id = auth.uid();

  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found.');
  END IF;

  IF p_amount > v_balance THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance.');
  END IF;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, wallet_id, amount, bank_details)
  VALUES (auth.uid(), v_wallet_id, p_amount, p_bank_details);

  -- Debit wallet balance immediately (locked funds)
  UPDATE public.wallets SET balance = balance - p_amount WHERE id = v_wallet_id;
  
  -- Create ledger entry
  INSERT INTO public.wallet_transactions (wallet_id, transaction_type, amount, description, reference_type)
  VALUES (v_wallet_id, 'debit', p_amount, 'Withdrawal Request', 'withdrawal');

  RETURN jsonb_build_object('success', true, 'message', 'Withdrawal requested successfully.');
END;
$$;
