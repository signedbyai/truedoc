-- Week 5-6: signer routing, invites, and the signing flow.
--
-- The signing flow itself never uses a Supabase auth session (signers prove
-- identity via an unguessable `signing_token`), so all signer-facing reads
-- and writes go through the service-role admin client and bypass RLS
-- entirely (see src/lib/supabase/admin.ts). The policies below only cover
-- the *org-side* screens: adding recipients and placing fields for them.

-- Org members can add/edit/remove signers on documents in their org.
create policy "org members can insert signers" on signers
  for insert with check (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = signers.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can update signers" on signers
  for update using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = signers.document_id and m.user_id = auth.uid()
    )
  );

create policy "org members can delete signers" on signers
  for delete using (
    exists (
      select 1 from documents d
      join organization_members m on m.org_id = d.org_id
      where d.id = signers.document_id and m.user_id = auth.uid()
    )
  );

-- document_fields already has a signer_id column (0001) and org-scoped
-- insert/update/delete policies (0003) that don't reference signer_id, so
-- no policy change is needed to let org members assign fields to signers.
