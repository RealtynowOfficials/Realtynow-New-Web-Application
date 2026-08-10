/*
# Reviews: support editing your own review

Property reviews (public.reviews, migration 0001) already had working
insert/select/delete-own RLS, but no UPDATE policy at all — so "edit your
review" was impossible even at the database level, and nothing stopped a
user from inserting multiple reviews for the same property. This migration:

1. Adds `updated_at` so edits are distinguishable from the original post.
2. Enforces one review per user per property (unique constraint), which is
   what makes "submit again" a genuine edit instead of a duplicate.
3. Adds the missing UPDATE policy, scoped to the review's own author.
*/

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_property_user_unique;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_property_user_unique UNIQUE (property_id, user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_reviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS on_reviews_updated_at ON public.reviews;
CREATE TRIGGER on_reviews_updated_at
  BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.handle_reviews_updated_at();
