-- Active Board interview score rows are anonymous. Existing legacy rows keep
-- their interviewer_id for historical linkage, but new rows deliberately use
-- NULL and are labelled only by their presentation order in the Board UI.
alter table public.interview_evaluations
  alter column interviewer_id drop not null;

comment on column public.interview_evaluations.interviewer_id is
  'Legacy evaluator linkage retained for historical rows; active Board score rows are anonymous and use NULL.';
