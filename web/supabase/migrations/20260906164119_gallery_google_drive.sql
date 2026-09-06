-- Switch the still-empty gallery to Google Drive. Abort rather than discard data
-- if the earlier implementation has been used in another environment.
do $$ begin
  if exists (select 1 from public.gallery_photos)
    or exists (select 1 from storage.objects where bucket_id = 'community-gallery') then
    raise exception 'Move existing gallery photos to Drive before this migration';
  end if;
end $$;

drop policy gallery_published_photo_read on storage.objects;
-- Keep the unused, empty private bucket: Storage requires its API for deletion.
update storage.buckets set file_size_limit = null where id = 'community-gallery';
alter table public.gallery_photos
  drop column image_path,
  drop column thumbnail_path,
  drop constraint gallery_photos_width_check,
  drop constraint gallery_photos_height_check,
  drop constraint gallery_photos_size_bytes_check,
  alter column width drop not null,
  alter column height drop not null,
  alter column size_bytes type bigint,
  add column drive_file_id text not null unique check (drive_file_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  add column mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif')),
  add check (width > 0),
  add check (height > 0),
  add check (size_bytes > 0);

-- Only the server can read this row. The OAuth refresh token is encrypted by
-- a separate server secret before it reaches the database.
create table public.gallery_drive_connection (
  singleton boolean primary key default true check (singleton),
  folder_id text not null check (folder_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  account_email text not null,
  encrypted_refresh_token text not null,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now()
);
create index gallery_drive_connected_by_idx on public.gallery_drive_connection(connected_by);
alter table public.gallery_drive_connection enable row level security;
revoke all on public.gallery_drive_connection from anon, authenticated;
grant all on public.gallery_drive_connection to service_role;
create policy gallery_drive_server_only on public.gallery_drive_connection
for all to authenticated using (false) with check (false);
