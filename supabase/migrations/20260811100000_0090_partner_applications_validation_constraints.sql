/*
  Migration 0090 — Partner Applications: Validation Constraints
  
  Adds CHECK and UNIQUE constraints to partner_applications as a backend safety
  net. These mirror the client-side validation rules in partner-validation.ts.
  
  Safety approach:
    - Uses NOT VALID to add CHECK constraints without scanning existing rows
      (any existing test/demo rows with non-standard formats won't be rejected)
    - Adds a UNIQUE index on mobile_number to prevent duplicate applications
    - Does NOT use VALIDATE CONSTRAINT so existing rows are not affected
  
  Application-level validation is the primary guard; DB constraints are the
  last line of defence.
*/

-- ─── Normalize existing mobile numbers ──────────────────────────────────────
-- Convert any existing rows that store the 10-digit form to +91XXXXXXXXXX
-- so the UNIQUE constraint works correctly across all rows.
UPDATE public.partner_applications
SET mobile_number = '+91' || mobile_number
WHERE mobile_number ~ '^[6-9][0-9]{9}$';

-- Also normalize 91XXXXXXXXXX (without leading +)
UPDATE public.partner_applications
SET mobile_number = '+' || mobile_number
WHERE mobile_number ~ '^91[6-9][0-9]{9}$';

-- ─── UNIQUE: prevent duplicate applications per mobile ────────────────────────
-- DROP first in case it was partially added before
DROP INDEX IF EXISTS idx_partner_applications_mobile_unique;
CREATE UNIQUE INDEX idx_partner_applications_mobile_unique
  ON public.partner_applications (mobile_number);

-- ─── CHECK: full_name length ──────────────────────────────────────────────────
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_full_name_length;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_full_name_length
  CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 100)
  NOT VALID;

-- ─── CHECK: mobile_number format (normalized +91XXXXXXXXXX) ───────────────────
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_mobile_format;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_mobile_format
  CHECK (mobile_number ~ '^\+91[6-9][0-9]{9}$')
  NOT VALID;

-- ─── CHECK: gst_number format ─────────────────────────────────────────────────
-- Allows NULL (optional field); if present, must be valid GSTIN structure
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_gst_format;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_gst_format
  CHECK (
    gst_number IS NULL OR (
      char_length(gst_number) = 15 AND
      gst_number ~ '^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'
    )
  )
  NOT VALID;

-- ─── CHECK: pan_number format ─────────────────────────────────────────────────
-- Allows NULL (optional field); if present, must be valid PAN structure
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_pan_format;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_pan_format
  CHECK (
    pan_number IS NULL OR
    pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
  )
  NOT VALID;

-- ─── CHECK: years_of_experience range ────────────────────────────────────────
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_years_range;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_years_range
  CHECK (
    years_of_experience IS NULL OR
    (years_of_experience >= 0 AND years_of_experience <= 60)
  )
  NOT VALID;

-- ─── CHECK: partner_type must be from allowed list ───────────────────────────
ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS chk_partner_type_allowed;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT chk_partner_type_allowed
  CHECK (partner_type IN (
    'Individual Partner',
    'Real Estate Consultant',
    'Property Consultant',
    'Broker',
    'Channel Partner',
    'Referral Partner',
    'Corporate Partner',
    'Builder / Developer Partner',
    'Financial Partner',
    'Interior / Home Services Partner',
    'Legal / Documentation Partner',
    'Other'
  ))
  NOT VALID;

-- ─── Index: email for duplicate look-ups ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partner_applications_email
  ON public.partner_applications (email)
  WHERE email IS NOT NULL;
