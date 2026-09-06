-- Shared with every signed-in account, including recruits without a profile.
-- Originals are staged privately and only validated, normalized photos are listed.
create table public.gallery_photos (
  id uuid primary key,
  uploader_id uuid references auth.users(id) on delete set null,
  uploader_name text not null check (char_length(btrim(uploader_name)) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 300),
  original_name text not null check (char_length(original_name) between 1 and 180),
  image_path text not null unique check (image_path ~ '^photos/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  thumbnail_path text not null unique check (thumbnail_path ~ '^thumbnails/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  width integer not null check (width between 1 and 2400),
  height integer not null check (height between 1 and 2400),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create index gallery_photos_created_idx on public.gallery_photos(created_at desc, id desc);
create index gallery_photos_uploader_idx on public.gallery_photos(uploader_id, created_at desc, id desc);
alter table public.gallery_photos enable row level security;
revoke all on public.gallery_photos from anon, authenticated;
grant select on public.gallery_photos to authenticated;
grant all on public.gallery_photos to service_role;

create policy gallery_photos_account_read on public.gallery_photos
for select to authenticated using (
  (select auth.uid()) is not null
  and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false'
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('community-gallery', 'community-gallery', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

-- No client write policies: only the server issues upload tokens for exact,
-- random incoming paths. Staged/unlisted files are never readable by clients.
create policy gallery_published_photo_read on storage.objects
for select to authenticated using (
  bucket_id = 'community-gallery'
  and coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false'
  and exists (
    select 1 from public.gallery_photos p
    where p.image_path = name or p.thumbnail_path = name
  )
);
