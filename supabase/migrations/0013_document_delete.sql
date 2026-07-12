-- Allows deleting a document row. Application code (see
-- src/app/api/documents/[id]/route.ts DELETE) restricts this to drafts only
-- — a draft was never sent, so there's no signer commitment or completed
-- audit trail to protect by refusing the delete at the database layer too.
-- signers, document_fields, and audit_events all already cascade off
-- documents.id (on delete cascade, 0001_init.sql), so a single documents
-- delete cleans up every child row automatically.

create policy "org members can delete documents" on documents
  for delete using (
    exists (
      select 1 from organization_members m
      where m.org_id = documents.org_id and m.user_id = auth.uid()
    )
  );
