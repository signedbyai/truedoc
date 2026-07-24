-- Admin role management (Phase 1 of ADMIN_ROLE_SCOPE.md, project root).
--
-- Adds the ability to promote an existing member into the org's single
-- admin-tier slot (owner + 1 admin, cap of 2 total) and to transfer either
-- admin-tier seat -- including the owner's -- to another member. Neither
-- capability existed before this: `admin` could previously only be set at
-- invite time (team/invite/route.ts) with no cap and no way to change it
-- afterward, and `owner` could never be removed or handed off at all
-- (team/members/[id]/route.ts hard-blocked it).
--
-- Both actions are implemented as SECURITY DEFINER functions rather than a
-- new RLS UPDATE policy + plain client-side .update() calls, because an
-- owner transfer touches two tables (organizations.owner_id AND the two
-- organization_members role rows) and must never leave an org with zero or
-- two owners even under a mid-request failure -- a single function call is
-- one transaction, two sequential client-side updates would not be. Mirrors
-- the existing is_org_member/is_org_admin SECURITY DEFINER pattern (see
-- 0004_fix_org_members_rls_recursion.sql, 0009_team_and_business_features.sql)
-- rather than introducing a new one.
--
-- Called via the regular (cookie-authenticated) Supabase client's .rpc() --
-- not the service-role admin client -- so auth.uid() resolves to the actual
-- caller inside the function and every rejection path (not authorized,
-- target already holds a seat, cap reached) is enforced by the function
-- itself, not just the calling API route. The route (src/app/api/team/
-- members/[id]/promote/route.ts, .../transfer/route.ts) still does its own
-- requester-role + plan check first, for a fast, specific error before ever
-- reaching the DB -- same belt-and-suspenders shape as team/invite/route.ts.

create or replace function public.promote_member_to_admin(p_target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_target_role text;
  v_requester_role text;
  v_admin_tier_count int;
begin
  select org_id, role into v_org_id, v_target_role
  from organization_members
  where id = p_target_member_id;

  if v_org_id is null then
    raise exception 'Member not found';
  end if;

  select role into v_requester_role
  from organization_members
  where org_id = v_org_id and user_id = auth.uid();

  if v_requester_role is null or v_requester_role not in ('owner', 'admin') then
    raise exception 'Only org owners/admins can promote members';
  end if;

  if v_target_role <> 'member' then
    raise exception 'That person already holds an admin-tier role';
  end if;

  select count(*) into v_admin_tier_count
  from organization_members
  where org_id = v_org_id and role in ('owner', 'admin');

  if v_admin_tier_count >= 2 then
    raise exception 'This org already has the maximum of 2 admins. Transfer or remove the existing admin first.';
  end if;

  update organization_members set role = 'admin' where id = p_target_member_id;
end;
$$;

create or replace function public.transfer_admin_seat(p_target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_target_role text;
  v_target_user_id uuid;
  v_requester_id uuid;
  v_requester_role text;
begin
  select org_id, role, user_id into v_org_id, v_target_role, v_target_user_id
  from organization_members
  where id = p_target_member_id;

  if v_org_id is null then
    raise exception 'Member not found';
  end if;

  select id, role into v_requester_id, v_requester_role
  from organization_members
  where org_id = v_org_id and user_id = auth.uid();

  if v_requester_role is null or v_requester_role not in ('owner', 'admin') then
    raise exception 'Only the current owner or admin can transfer their role';
  end if;

  if v_requester_id = p_target_member_id then
    raise exception 'You already hold that role';
  end if;

  if v_target_role <> 'member' then
    raise exception 'That person already holds an admin-tier role';
  end if;

  if v_requester_role = 'owner' then
    -- Keep organizations.owner_id in sync with the role row -- see
    -- ADMIN_ROLE_SCOPE.md on why both exist. Historical owner_id values
    -- already recorded on past documents/audit rows are untouched; this
    -- only updates the org's *current* owner pointer.
    update organizations set owner_id = v_target_user_id where id = v_org_id;
    update organization_members set role = 'owner' where id = p_target_member_id;
    update organization_members set role = 'member' where id = v_requester_id;
  else
    update organization_members set role = 'admin' where id = p_target_member_id;
    update organization_members set role = 'member' where id = v_requester_id;
  end if;
end;
$$;
