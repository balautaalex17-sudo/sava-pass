alter table public.membership_applications
  add column if not exists answers jsonb not null default '{}'::jsonb;

comment on column public.membership_applications.answers is
  'Structured recruitment form answers keyed by stable question identifier.';
