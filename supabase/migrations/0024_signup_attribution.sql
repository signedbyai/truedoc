-- First-touch signup attribution. Captures the UTM params (and referrer/
-- landing path) from the visitor's FIRST entry to the site — e.g. a LinkedIn
-- quiz ad's `/quiz?utm_source=linkedin&utm_campaign=signature-quiz` — stashed
-- client-side and recorded on the org once the person signs up. Threading
-- UTMs through every link + the auth redirects is fragile; storing them and
-- recording at signup is the robust version. Set once (first-touch); an org
-- that already has a source keeps it.
alter table organizations add column if not exists signup_utm_source text;
alter table organizations add column if not exists signup_utm_medium text;
alter table organizations add column if not exists signup_utm_campaign text;
alter table organizations add column if not exists signup_utm_content text;
alter table organizations add column if not exists signup_utm_term text;
alter table organizations add column if not exists signup_referrer text;
alter table organizations add column if not exists signup_landing_path text;
