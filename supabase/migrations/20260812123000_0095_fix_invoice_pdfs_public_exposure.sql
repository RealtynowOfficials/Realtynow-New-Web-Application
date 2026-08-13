/*
  Security fix: the `invoice-pdfs` bucket was created with `public = true` and
  an unrestricted SELECT policy (`USING (bucket_id = 'invoice-pdfs')`, no
  role/owner check at all). A public Supabase Storage bucket serves objects
  via /storage/v1/object/public/... which bypasses RLS entirely by design —
  financial invoice PDFs were servable to anyone who had (or guessed) the
  path, regardless of the SELECT policy.

  Fix: flip the bucket to private and replace the SELECT policy with one
  scoped to the invoice's own customer (via the path convention
  `<invoice.id>/<invoice_number>.pdf`, matching InvoicePreview.tsx's upload)
  or admin. The frontend must now request a signed URL instead of the old
  public URL (src/components/invoices/InvoicePreview.tsx,
  src/pages/admin/payments.tsx) — done alongside this migration.
*/

update storage.buckets set public = false where id = 'invoice-pdfs';

drop policy if exists "invoice_pdfs_public_read" on storage.objects;
create policy "invoice_pdfs_owner_read" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoice-pdfs'
    and (
      public.is_admin()
      or (storage.foldername(name))[1]::uuid in (
        select ti.id from public.txn_invoices ti
        join public.txn_customers tc on tc.id = ti.customer_id
        where tc.profile_id = auth.uid()
      )
    )
  );
