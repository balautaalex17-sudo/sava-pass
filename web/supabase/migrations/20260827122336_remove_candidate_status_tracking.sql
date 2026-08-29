-- Candidate application updates are delivered by email. The public tracking
-- page was retired, so new confirmation emails must not contain its URL.
update public.notification_templates
set
  body_template = 'Salut, {{first_name}}. Aplicația ta a ajuns la echipa Interact Sf. Sava. Te vom contacta pe email sau telefon dacă mergem mai departe.',
  updated_at = pg_catalog.now()
where key = 'application_submitted';
