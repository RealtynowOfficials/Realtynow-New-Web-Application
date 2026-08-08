/*
# Fix Foreign Key constraints for Reviews joins

This migration adds explicit foreign key constraints to `public.profiles(id)` for the `user_id` column in `public.reviews`.
Without this, Supabase PostgREST fails to resolve inner joins between `reviews` and `profiles`.
*/

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_user_id_profiles_fkey;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
