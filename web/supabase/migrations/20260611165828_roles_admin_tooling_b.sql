alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

delete from public.profiles
where full_name = 'Staff'
  and role = 'scanner';

drop policy if exists scans_staff_insert on public.scans;

create policy scans_staff_insert
on public.scans
for insert
with check (
  scanned_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'scanner')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'posters',
  'posters',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
