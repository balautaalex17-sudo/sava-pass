-- Reviewers can submit form scores without adding a written comment.

alter table public.application_evaluations
  drop constraint if exists application_evaluations_comment_check;

alter table public.application_evaluations
  add constraint application_evaluations_comment_check
  check (char_length(comment) <= 5000);

comment on column public.application_evaluations.comment is
  'Optional private context from the reviewer; an empty string means no comment.';
