-- ===========================================================================
-- Storage: privater Bucket für Behördenunterlagen
--
-- Pfadschema:  users/{userId}/cases/{caseId}/documents/{documentId}
-- Der Bucket ist NICHT öffentlich. Zugriff ausschließlich über signierte
-- URLs oder authentifizierte Requests des jeweiligen Eigentümers.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-documents',
  'case-documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.foldername('users/<uid>/cases/...') -> {users, <uid>, cases, ...}
-- Element 2 ist die User-ID; nur der Eigentümer darf zugreifen.
create policy "case_documents_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "case_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "case_documents_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "case_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
