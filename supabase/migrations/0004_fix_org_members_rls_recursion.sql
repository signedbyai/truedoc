-- Fix infinite recursion in the organization_members RLS policy.
--
-- The original policy queried organization_members from within its own USING
-- clause to check membership, which Postgres flags as infinite recursion on
-- every direct select against the table (error: "infinite recursion detected
-- in policy for relation organization_members"). The app swallowed this error
-- as "no membership found," which surfaced as a false "Not authenticated" on
-- any route that looked up the caller's org (e.g. the document upload API).
--
-- Fix: check membership via a SECURITY DEFINER function, which runs with the
-- function owner's privileges and bypasses RLS on the inner lookup instead of
-- recursively re-applying the policy.

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where org_id = target_org_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members can view own org roster" on organization_members;
create policy "members can view own org roster" on organization_members
  for select using (is_org_member(org_id));
