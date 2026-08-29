-- PostgreSQL enum values need their own committed migration before later
-- policies can safely depend on them.
alter type public.staff_role add value if not exists 'interviewer';
