-- Membership (Devino membru) recruitment applications.
-- Free club application: form -> email confirmation -> interview (off-platform).
create table if not exists public.membership_applications (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  full_name    text not null,
  email        text not null,
  phone        text not null,
  grade        text,                 -- clasa / an de studiu
  motivation   text not null,        -- de ce Interact
  strength     text,                 -- ce aduci echipei
  availability text,                 -- disponibilitate
  status       text not null default 'new'
               check (status in ('new','reviewing','interview','accepted','declined')),
  source       text not null default 'web'
);

create index if not exists membership_applications_created_at_idx
  on public.membership_applications (created_at desc);

alter table public.membership_applications enable row level security;

-- Public application form: anyone may submit.
create policy "anyone can submit a membership application"
  on public.membership_applications
  for insert
  to anon, authenticated
  with check (true);

-- Only staff may read submitted applications.
create policy "staff can read membership applications"
  on public.membership_applications
  for select
  to authenticated
  using (public.is_staff());

-- Only admins may update application status (used by a future triage UI).
create policy "admins can update membership applications"
  on public.membership_applications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
