create or replace function public.version_recruitment_questions(
  p_campaign_id uuid,
  p_questions jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.recruitment_forms%rowtype;
  v_new_id uuid;
  v_next_version integer;
  v_matching_questions integer;
begin
  if jsonb_typeof(p_questions) <> 'object' or not (
    select
      count(*) = 6
      and bool_and(question_key = any (array[
        'about_you',
        'mistake',
        'team_priority',
        'club_exchange',
        'promote_event',
        'team_organization'
      ]))
      and bool_and(
        jsonb_typeof(p_questions -> question_key) = 'string'
        and char_length(btrim(p_questions ->> question_key)) between 10 and 500
      )
    from jsonb_object_keys(p_questions) as keys(question_key)
  ) then
    raise exception 'invalid_recruitment_questions';
  end if;

  select form.*
  into v_current
  from public.recruitment_forms as form
  where form.campaign_id = p_campaign_id
    and form.status = 'active'
  order by form.version desc
  limit 1
  for update;

  if not found then
    raise exception 'active_recruitment_form_not_found';
  end if;

  select count(*)
  into v_matching_questions
  from public.recruitment_fields as field
  where field.form_id = v_current.id
    and field.key = any (array[
      'about_you',
      'mistake',
      'team_priority',
      'club_exchange',
      'promote_event',
      'team_organization'
    ])
    and field.label = btrim(p_questions ->> field.key);

  if v_matching_questions = 6 then
    return v_current.id;
  end if;

  select coalesce(max(form.version), 0) + 1
  into v_next_version
  from public.recruitment_forms as form
  where form.title = v_current.title;

  insert into public.recruitment_forms (
    campaign_id,
    title,
    version,
    status
  ) values (
    v_current.campaign_id,
    v_current.title,
    v_next_version,
    'draft'
  )
  returning id into v_new_id;

  insert into public.recruitment_fields (
    form_id,
    key,
    source_header,
    label,
    type,
    required,
    position,
    options,
    conditional_rules,
    is_system
  )
  select
    v_new_id,
    field.key,
    field.source_header,
    case
      when p_questions ? field.key then btrim(p_questions ->> field.key)
      else field.label
    end,
    field.type,
    field.required,
    field.position,
    field.options,
    field.conditional_rules,
    field.is_system
  from public.recruitment_fields as field
  where field.form_id = v_current.id;

  update public.recruitment_forms
  set status = 'archived'
  where campaign_id = p_campaign_id
    and status = 'active';

  update public.recruitment_forms
  set status = 'active'
  where id = v_new_id;

  return v_new_id;
end;
$$;

revoke all on function public.version_recruitment_questions(uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.version_recruitment_questions(uuid, jsonb)
to service_role;

comment on function public.version_recruitment_questions(uuid, jsonb) is
  'Creates an active recruitment form version when editable question labels change.';
