/*
# Fix Foreign Key constraints for Profiles joins

This migration adds explicit foreign key constraints to `public.profiles(id)` for columns that previously only referenced `auth.users(id)`. 
Without these explicit constraints, Supabase PostgREST fails to resolve inner/left joins between these tables and `profiles`, resulting in silent query failures.
*/

-- 1. Properties Table -> Profiles
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_owner_id_profiles_fkey;
ALTER TABLE public.properties ADD CONSTRAINT properties_owner_id_profiles_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_assigned_agent_id_profiles_fkey;
ALTER TABLE public.properties ADD CONSTRAINT properties_assigned_agent_id_profiles_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Enquiries Table -> Profiles
ALTER TABLE public.enquiries DROP CONSTRAINT IF EXISTS enquiries_agent_id_profiles_fkey;
ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_agent_id_profiles_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Audit Logs -> Profiles
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_profiles_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_profiles_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Appointments Table -> Profiles (Wait, let's also fix this since agent/agent.tsx uses it)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_customer_id_profiles_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_customer_id_profiles_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_agent_id_profiles_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_agent_id_profiles_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
