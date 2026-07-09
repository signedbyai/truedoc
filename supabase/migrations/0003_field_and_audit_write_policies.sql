-- 0001_init.sql only granted SELECT on document_fields and audit_events.
-- The upload + field-placement editor (Week 3-4) needs to write to both,
-- scoped to the same org-membership check used everywhere else.

create policy "org members can insert fields" on document_fields
  for insert with check (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = document_fields.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can update fields" on document_fields
  for update using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = document_fields.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can delete fields" on document_fields
  for delete using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = document_fields.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can insert audit events" on audit_events
  for insert with check (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = audit_events.document_id and m.user_id = auth.uid()
    )
  );
