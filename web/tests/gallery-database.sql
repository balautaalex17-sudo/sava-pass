-- Staging/local only. Disposable fixtures, all changes and privileges roll back.
begin;
do $$
declare
  v_recruit uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_board uuid := gen_random_uuid();
  v_photo uuid := gen_random_uuid();
  v_count integer;
begin
  insert into auth.users(id, email) values
    (v_recruit, v_recruit::text || '@example.com'),
    (v_member, v_member::text || '@example.com'),
    (v_board, v_board::text || '@example.com');
  insert into public.profiles(id, email, full_name, membership_status) values
    (v_member, v_member::text || '@example.com', 'Gallery fixture member', 'active'),
    (v_board, v_board::text || '@example.com', 'Gallery fixture board', 'active');
  update public.profiles set role = 'board' where id = v_board;
  assert not exists(select 1 from public.profiles where id = v_recruit), 'Recruit has no member profile';
  set local role service_role;
  insert into public.gallery_photos(id, uploader_id, uploader_name, original_name, drive_file_id, mime_type, size_bytes)
  values (v_photo, v_recruit, 'Gallery fixture recruit', 'large.heic', 'fixture_' || replace(v_photo::text, '-', ''), 'image/heic', 12884901888);
  reset role;
  assert (select size_bytes = 12884901888 from public.gallery_photos where id = v_photo), 'Large original keeps its exact byte size';

  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_recruit, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;
  select count(*) into v_count from public.gallery_photos where id = v_photo;
  assert v_count = 1, 'Recruit without a profile can see the gallery';
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_member, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;
  select count(*) into v_count from public.gallery_photos where id = v_photo;
  assert v_count = 1, 'Other members can see uploaded photos';
  begin
    delete from public.gallery_photos where id = v_photo;
    raise exception 'Client deletion unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    select count(*) into v_count from public.gallery_drive_connection;
    raise exception 'OAuth credentials unexpectedly readable';
  exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_board, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  set local role authenticated;
  select count(*) into v_count from public.gallery_photos where id = v_photo;
  assert v_count = 1, 'Board can view gallery';
  reset role;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_recruit, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  set local role authenticated;
  select count(*) into v_count from public.gallery_photos where id = v_photo;
  assert v_count = 0, 'Anonymous Auth sessions cannot read gallery';
  reset role;
  set local role anon;
  begin
    select count(*) into v_count from public.gallery_photos;
    raise exception 'Signed-out visitor unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;
rollback;
