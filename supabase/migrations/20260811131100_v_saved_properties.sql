-- Migration: 20260811131100_v_saved_properties.sql
-- Description: Create v_saved_properties view for advanced filtering

CREATE OR REPLACE VIEW public.v_saved_properties AS
SELECT
  f.id AS favorite_id,
  f.user_id AS favorite_user_id,
  f.created_at AS favorited_at,
  p.*
FROM public.favorites f
JOIN public.v_properties_search p ON p.id = f.property_id;

-- Ensure users can only select their own favorites via the view by checking user_id
-- We cannot put RLS on a regular view easily, but we can query it with .eq('favorite_user_id', user.id)
-- Or better, we can secure it using a function or wait, the base table `favorites` has RLS!
-- By default, Postgres views run with the privileges of the view owner. Wait, if it's a security barrier view or simply querying the underlying table, we might need to be careful.
-- Actually, we can just enforce filtering on the frontend:
-- supabase.from('v_saved_properties').select('*').eq('favorite_user_id', user.id)
