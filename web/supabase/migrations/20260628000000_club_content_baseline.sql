-- Reconstructs the club-content migration that was applied directly to the
-- original hosted project but was missing from the local migration history.
-- The statements are idempotent so an existing environment is not damaged.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  photo_path text,
  bio text,
  mandate text,
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_members_active_sort_idx
  on public.team_members (active, sort);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  date_label text,
  location text,
  summary text,
  body text,
  beneficiary text,
  cover_path text,
  gallery jsonb not null default '[]'::jsonb,
  category text,
  published boolean not null default false,
  sort integer not null default 0,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists projects_published_sort_idx
  on public.projects (published, sort);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  url text,
  tier text not null default 'partener',
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists sponsors_active_sort_idx
  on public.sponsors (active, sort);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  handled boolean not null default false
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;
alter table public.projects enable row level security;
alter table public.sponsors enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_content enable row level security;

drop policy if exists team_members_read on public.team_members;
drop policy if exists team_members_write on public.team_members;
drop policy if exists projects_read on public.projects;
drop policy if exists projects_write on public.projects;
drop policy if exists sponsors_read on public.sponsors;
drop policy if exists sponsors_write on public.sponsors;
drop policy if exists site_content_read on public.site_content;
drop policy if exists site_content_write on public.site_content;
drop policy if exists contact_messages_insert on public.contact_messages;
drop policy if exists contact_messages_staff_read on public.contact_messages;
drop policy if exists contact_messages_admin_update on public.contact_messages;

create policy team_members_read on public.team_members
  for select to public using ((active = true) or is_staff());
create policy team_members_write on public.team_members
  for all to authenticated using (is_admin()) with check (is_admin());

create policy projects_read on public.projects
  for select to public using ((published = true) or is_staff());
create policy projects_write on public.projects
  for all to authenticated using (is_admin()) with check (is_admin());

create policy sponsors_read on public.sponsors
  for select to public using ((active = true) or is_staff());
create policy sponsors_write on public.sponsors
  for all to authenticated using (is_admin()) with check (is_admin());

create policy site_content_read on public.site_content
  for select to public using (true);
create policy site_content_write on public.site_content
  for all to authenticated using (is_admin()) with check (is_admin());

create policy contact_messages_insert on public.contact_messages
  for insert to public with check (true);
create policy contact_messages_staff_read on public.contact_messages
  for select to authenticated using (is_staff());
create policy contact_messages_admin_update on public.contact_messages
  for update to authenticated using (is_admin()) with check (is_admin());

-- New Supabase projects no longer expose public tables to the Data API by
-- default. Grants are explicit and still constrained by the RLS policies.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.team_members, public.projects, public.sponsors, public.site_content
  to anon, authenticated;
grant insert, update, delete on public.team_members, public.projects, public.sponsors, public.site_content
  to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;
grant all on public.team_members, public.projects, public.sponsors,
  public.contact_messages, public.site_content to service_role;

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
drop policy if exists "media staff insert" on storage.objects;
drop policy if exists "media staff update" on storage.objects;
drop policy if exists "media staff delete" on storage.objects;

create policy "media public read" on storage.objects
  for select to public using (bucket_id = 'media');
create policy "media staff insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and is_staff());
create policy "media staff update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and is_staff())
  with check (bucket_id = 'media' and is_staff());
create policy "media staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and is_staff());
