-- Keep the enum change in its own migration. PostgreSQL only allows a newly
-- added enum value to be referenced after the transaction that adds it commits.
alter type public.staff_role add value if not exists 'board';
