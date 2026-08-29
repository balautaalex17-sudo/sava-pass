-- Interview participation is selected by the permission itself. Scheduling and
-- committee records remain in the schema for compatibility with legacy data.
update public.permissions
set
  label = 'Participă la toate interviurile de recrutare',
  description = 'Vezi candidații promovați și salvează propria evaluare pentru fiecare interviu.'
where key = 'evaluate_interview_candidates';
