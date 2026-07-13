-- Distinct customers (organizations) — run in the Supabase SQL editor.
-- "Customer" = an organization, the billing/tenant unit in this schema
-- (organizations.owner_id -> auth.users, organizations.plan/stripe_* columns).

-- 1) All distinct customers, with owner email + doc count
select
  o.id            as org_id,
  o.name          as org_name,
  o.plan,
  u.email         as owner_email,
  o.stripe_customer_id,
  o.created_at,
  count(d.id)     as document_count
from organizations o
join auth.users u on u.id = o.owner_id
left join documents d on d.org_id = o.id
group by o.id, o.name, o.plan, u.email, o.stripe_customer_id, o.created_at
order by o.created_at desc;

-- 2) Just the count of distinct customers
select count(*) as distinct_customers from organizations;

-- 3) Paying customers only (plan != 'free', i.e. has a Stripe subscription)
select
  o.id as org_id,
  o.name as org_name,
  o.plan,
  u.email as owner_email,
  o.stripe_customer_id,
  o.created_at
from organizations o
join auth.users u on u.id = o.owner_id
where o.plan <> 'free'
order by o.created_at desc;

-- 4) Distinct individual people instead (every org member, not just owners) —
-- use this if "customers" should mean people rather than organizations
select distinct u.email
from organization_members om
join auth.users u on u.id = om.user_id
order by u.email;
