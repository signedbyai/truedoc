-- Auto-provision a personal organization + free subscription row whenever a new
-- auth user is created. Keeps onboarding to zero extra steps for solo users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into organizations (name, owner_id, plan)
  values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)) || '''s workspace', new.id, 'free')
  returning id into new_org_id;

  insert into organization_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into subscriptions (org_id, plan, status)
  values (new_org_id, 'free', 'active');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
