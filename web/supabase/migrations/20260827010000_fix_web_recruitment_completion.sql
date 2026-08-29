-- Web applications keep identity fields in dedicated columns, while long-form
-- responses live in answers. Count both locations when calculating completion.
create or replace function public.calculate_recruitment_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_field record;
  v_total integer := 0;
  v_answered integer := 0;
  v_missing text[] := '{}'::text[];
  v_value text;
  v_condition_value text;
  v_condition_applies boolean;
  v_operator text;
begin
  for v_field in
    select rf.key, rf.source_header, rf.label, rf.required, rf.conditional_rules
    from public.recruitment_fields rf
    where rf.form_id = new.form_id
    order by rf.position
  loop
    v_condition_applies := true;

    if v_field.conditional_rules is not null
      and jsonb_typeof(v_field.conditional_rules) = 'object'
      and v_field.conditional_rules ? 'field' then
      v_condition_value := coalesce(new.answers ->> (v_field.conditional_rules ->> 'field'), '');
      v_operator := coalesce(v_field.conditional_rules ->> 'operator', 'equals');

      v_condition_applies := case v_operator
        when 'equals' then v_condition_value = coalesce(v_field.conditional_rules ->> 'value', '')
        when 'not_equals' then v_condition_value <> coalesce(v_field.conditional_rules ->> 'value', '')
        when 'not_empty' then btrim(v_condition_value) <> ''
        when 'in' then coalesce((v_field.conditional_rules -> 'value') ? v_condition_value, false)
        else false
      end;
    end if;

    if v_field.required and v_condition_applies then
      v_total := v_total + 1;
      v_value := coalesce(
        nullif(new.answers ->> v_field.key, ''),
        case v_field.key
          when 'full_name' then nullif(new.full_name, '')
          when 'email' then nullif(new.email, '')
          when 'phone' then nullif(new.phone, '')
          when 'grade' then nullif(new.grade, '')
          else null
        end,
        nullif(new.source_payload ->> v_field.source_header, ''),
        ''
      );

      if btrim(v_value) = '' then
        v_missing := array_append(v_missing, v_field.label);
      else
        v_answered := v_answered + 1;
      end if;
    end if;
  end loop;

  if v_total = 0 then
    new.completion_percentage := 100;
    new.is_complete := true;
  else
    new.completion_percentage := floor((v_answered::numeric / v_total::numeric) * 100)::integer;
    new.is_complete := v_answered = v_total;
  end if;

  new.missing_required_fields := v_missing;
  return new;
end;
$$;

drop trigger if exists membership_application_completion on public.membership_applications;
create trigger membership_application_completion
before insert or update of form_id, answers, source_payload, full_name, email, phone, grade
on public.membership_applications
for each row execute function public.calculate_recruitment_completion();

-- Recalculate existing applications with the corrected source mapping.
update public.membership_applications
set answers = answers
where form_id is not null;
