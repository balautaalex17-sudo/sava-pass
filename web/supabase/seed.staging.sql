-- Date demonstrative pentru proiectul Supabase sava-pass-staging.
-- Script idempotent: aceleași UUID-uri sunt actualizate, nu duplicate.

begin;

insert into public.events (
  id, slug, title, subtitle, starts_at, doors, date_label, date_long,
  venue, venue_line, price_bani, capacity, status, accent, photo_url,
  about, program, perks
) values (
  '11111111-1111-4111-8111-111111111111',
  'eveniment-staging',
  '[STAGING] Eveniment cash de test',
  'Rezervare, plată la intrare și verificare QR',
  now() + interval '30 days',
  '18:30',
  'În 30 de zile',
  'Dată dinamică pentru mediul de staging',
  'Colegiul Național Sfântul Sava',
  'Sala de festivități · acces de test',
  4500,
  120,
  'active',
  '#00A7E8',
  '/landing/hero.jpg',
  'Eveniment creat exclusiv pentru testarea fluxului cash, a biletelor și a scannerului QR.',
  '[{"time":"18:30","title":"Acces și plată cash"},{"time":"19:00","title":"Începerea evenimentului"},{"time":"21:00","title":"Încheiere"}]'::jsonb,
  '["Bilet rezervat online","Plată cash la acces","QR individual"]'::jsonb
)
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  starts_at = excluded.starts_at,
  date_label = excluded.date_label,
  date_long = excluded.date_long,
  venue = excluded.venue,
  venue_line = excluded.venue_line,
  price_bani = excluded.price_bani,
  capacity = excluded.capacity,
  status = excluded.status,
  photo_url = excluded.photo_url,
  about = excluded.about,
  program = excluded.program,
  perks = excluded.perks;

insert into public.events (
  id, slug, title, subtitle, starts_at, doors, date_label, date_long,
  venue, price_bani, capacity, status, photo_url, about, program, perks
) values (
  '11111111-1111-4111-8111-222222222222',
  'eveniment-staging-arhivat',
  '[STAGING] Eveniment arhivat',
  'Folosit pentru verificarea arhivei',
  now() - interval '60 days',
  '18:00',
  'Acum 60 de zile',
  'Eveniment trecut de test',
  'București',
  3000,
  80,
  'past',
  '/landing/about.jpg',
  'Conținut de test pentru paginile cu evenimente trecute.',
  '[]'::jsonb,
  '[]'::jsonb
)
on conflict (id) do update set
  starts_at = excluded.starts_at,
  status = excluded.status,
  title = excluded.title;

insert into public.event_ticket_types (
  id, event_id, slug, name, description, price_bani, capacity,
  sales_start_at, sales_end_at, status, sort
) values
  (
    '12111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    'standard',
    'Acces standard',
    'Rezervare online și plată cash la intrare.',
    4500,
    100,
    now() - interval '1 day',
    now() + interval '29 days',
    'active',
    10
  ),
  (
    '12111111-1111-4111-8111-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'invitat',
    'Invitat / protocol',
    'Tip gratuit pentru verificarea emiterii biletelor comp.',
    0,
    20,
    now() - interval '1 day',
    now() + interval '29 days',
    'active',
    20
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_bani = excluded.price_bani,
  capacity = excluded.capacity,
  sales_start_at = excluded.sales_start_at,
  sales_end_at = excluded.sales_end_at,
  status = excluded.status,
  sort = excluded.sort;

-- Migrațiile livrează deja campania, departamentele, formularul activ și
-- întrebările oficiale. În staging ajustăm doar perioada, astfel încât formularul
-- să poată fi testat în orice zi fără a crea o a doua campanie deschisă.
update public.recruitment_campaigns
set
  title = '[STAGING] Recrutare Interact Sf. Sava',
  eyebrow = 'Mediu de test',
  intro = 'Campanie deschisă pentru testarea formularului, evaluărilor și interviurilor.',
  status = 'open',
  opens_at = now() - interval '1 day',
  closes_at = now() + interval '120 days',
  application_limit = 500,
  closed_message = 'Campania de staging este închisă temporar pentru un scenariu de test.'
where slug = 'generatia-2026-2027';

insert into public.interview_periods (
  id, campaign_id, title, starts_at, ends_at,
  slot_duration_minutes, default_location, active
) values (
  '25111111-1111-4111-8111-111111111111',
  (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027'),
  '[STAGING] Perioadă interviuri',
  now() + interval '10 days',
  now() + interval '20 days',
  20,
  'CNSS · Sala de test',
  true
)
on conflict (id) do update set
  title = excluded.title,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  slot_duration_minutes = excluded.slot_duration_minutes,
  default_location = excluded.default_location,
  active = excluded.active;

insert into public.interview_slots (
  id, period_id, starts_at, ends_at, room, capacity, active
) values
  ('26111111-1111-4111-8111-111111111111', '25111111-1111-4111-8111-111111111111', now() + interval '12 days 14 hours', now() + interval '12 days 14 hours 20 minutes', 'Sala 12', 4, true),
  ('26111111-1111-4111-8111-222222222222', '25111111-1111-4111-8111-111111111111', now() + interval '12 days 14 hours 30 minutes', now() + interval '12 days 14 hours 50 minutes', 'Sala 12', 4, true)
on conflict (id) do update set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  room = excluded.room,
  capacity = excluded.capacity,
  active = excluded.active;

insert into public.membership_applications (
  id, full_name, email, phone, grade, motivation, strength, availability,
  status, source, campaign_id, public_token, submitted_at, answers, form_id,
  source_payload
) values
  (
    '27111111-1111-4111-8111-111111111111',
    'Ana Test Formular',
    'ana.formular@staging.invalid',
    '0700000001',
    'Clasa a X-a',
    'Pot ajuta clubul prin seriozitate și idei concrete.',
    'Comunicare',
    'Joi după 17:00',
    'submitted',
    'staging_seed',
    (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027'),
    '27111111-1111-4111-8111-aaaaaaaaaaaa',
    now() - interval '2 days',
    '{"about_you":"Sunt atentă la detalii. Colegii observă asta după ce lucrăm împreună.","mistake":"Am estimat greșit timpul unei sarcini. Am anunțat echipa și am refăcut planul.","team_priority":"Promisiunea contează, dar comunicarea este esențială. Aș explica rapid riscul și aș decide cu echipa.","club_exchange":"Pot oferi consecvență și idei. Sper să învăț să organizez proiecte mai bune.","promote_event":"Aș discuta direct cu clasele și aș folosi ambasadori. Aș prezenta beneficiul concret pentru elevi.","team_organization":"Aș folosi responsabilități clare și un tabel comun. Am verifica progresul zilnic într-o întâlnire scurtă."}'::jsonb,
    (select id from public.recruitment_forms where status = 'active' and campaign_id = (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027') order by version desc limit 1),
    '{"Nume și prenume":"Ana Test Formular","Email":"ana.formular@staging.invalid","Număr de telefon":"0700000001","Clasa":"Clasa a X-a"}'::jsonb
  ),
  (
    '27111111-1111-4111-8111-222222222222',
    'Mihai Test Interviu',
    'mihai.interviu@staging.invalid',
    '0700000002',
    'Clasa a XI-a',
    'Pot contribui la organizare și la relația cu partenerii.',
    'Organizare',
    'Vineri după 16:00',
    'interview_scheduled',
    'staging_seed',
    (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027'),
    '27111111-1111-4111-8111-bbbbbbbbbbbb',
    now() - interval '3 days',
    '{"about_you":"Îmi place să organizez lucrurile înainte să încep. Echipa vede asta când împărțim sarcinile.","mistake":"Am uitat să confirm o rezervare. Mi-am asumat greșeala și am creat o listă de verificare.","team_priority":"Aș proteja rezultatul fără să ascund problema. Aș renegocia promisiunea împreună cu echipa.","club_exchange":"Ofer structură și calm. Vreau să învăț cum se coordonează un eveniment real.","promote_event":"Aș face demonstrații scurte în pauze și recomandări între colegi. Aș măsura înscrierile zilnic.","team_organization":"Aș defini un responsabil pentru fiecare rezultat. Aș folosi termene mici și o verificare comună."}'::jsonb,
    (select id from public.recruitment_forms where status = 'active' and campaign_id = (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027') order by version desc limit 1),
    '{"Nume și prenume":"Mihai Test Interviu","Email":"mihai.interviu@staging.invalid","Număr de telefon":"0700000002","Clasa":"Clasa a XI-a"}'::jsonb
  ),
  (
    '27111111-1111-4111-8111-333333333333',
    'Ioana Test Incomplet',
    'ioana.incomplet@staging.invalid',
    '0700000003',
    'Clasa a IX-a',
    'Aplicație incompletă pentru verificarea filtrelor.',
    null,
    null,
    'draft',
    'staging_seed',
    (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027'),
    '27111111-1111-4111-8111-cccccccccccc',
    null,
    '{"about_you":"Am completat doar primul răspuns. Restul rămân intenționat necompletate."}'::jsonb,
    (select id from public.recruitment_forms where status = 'active' and campaign_id = (select id from public.recruitment_campaigns where slug = 'generatia-2026-2027') order by version desc limit 1),
    '{}'::jsonb
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  grade = excluded.grade,
  motivation = excluded.motivation,
  strength = excluded.strength,
  availability = excluded.availability,
  status = excluded.status,
  campaign_id = excluded.campaign_id,
  submitted_at = excluded.submitted_at,
  answers = excluded.answers,
  form_id = excluded.form_id,
  source_payload = excluded.source_payload;

insert into public.application_status_events (
  id, application_id, from_status, to_status, note, visible_to_candidate, created_at
) values
  ('28111111-1111-4111-8111-111111111111', '27111111-1111-4111-8111-111111111111', null, 'submitted', 'Aplicație demonstrativă trimisă.', true, now() - interval '2 days'),
  ('28111111-1111-4111-8111-222222222222', '27111111-1111-4111-8111-222222222222', null, 'submitted', 'Aplicație demonstrativă trimisă.', true, now() - interval '3 days'),
  ('28111111-1111-4111-8111-333333333333', '27111111-1111-4111-8111-222222222222', 'submitted', 'interview_scheduled', 'Interviu demonstrativ programat.', true, now() - interval '1 day')
on conflict (id) do update set
  application_id = excluded.application_id,
  from_status = excluded.from_status,
  to_status = excluded.to_status,
  note = excluded.note,
  visible_to_candidate = excluded.visible_to_candidate,
  created_at = excluded.created_at;

insert into public.interviews (
  id, application_id, slot_id, status, location, scheduled_at, arrival_status
) values (
  '29111111-1111-4111-8111-111111111111',
  '27111111-1111-4111-8111-222222222222',
  '26111111-1111-4111-8111-111111111111',
  'scheduled',
  'CNSS · Sala 12',
  now() + interval '12 days 14 hours',
  'pending'
)
on conflict (id) do update set
  application_id = excluded.application_id,
  slot_id = excluded.slot_id,
  status = excluded.status,
  location = excluded.location,
  scheduled_at = excluded.scheduled_at,
  arrival_status = excluded.arrival_status;

insert into public.team_members (
  id, name, role, bio, mandate, sort, active
) values
  ('31111111-1111-4111-8111-111111111111', '[STAGING] Alex Test', 'Președinte demonstrativ', 'Profil fictiv folosit numai pentru verificarea paginii Echipa.', '2026–2027', 10, true),
  ('31111111-1111-4111-8111-222222222222', '[STAGING] Mara Test', 'Coordonator proiecte', 'Profil fictiv folosit numai în staging.', '2026–2027', 20, true)
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  bio = excluded.bio,
  mandate = excluded.mandate,
  sort = excluded.sort,
  active = excluded.active;

insert into public.projects (
  id, slug, title, date_label, location, summary, body, beneficiary,
  category, published, sort, event_id
) values (
  '32111111-1111-4111-8111-111111111111',
  'proiect-staging',
  '[STAGING] Proiect demonstrativ',
  '2026',
  'București',
  'Conținut evident fictiv pentru verificarea listelor și paginii de detaliu.',
  'Acest proiect există doar în baza de date de staging. Poate fi editat sau șters în timpul testelor.',
  'Beneficiar demonstrativ',
  'Test',
  true,
  10,
  '11111111-1111-4111-8111-111111111111'
)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  body = excluded.body,
  beneficiary = excluded.beneficiary,
  category = excluded.category,
  published = excluded.published,
  sort = excluded.sort,
  event_id = excluded.event_id;

insert into public.sponsors (
  id, name, url, tier, sort, active
) values
  ('33111111-1111-4111-8111-111111111111', '[STAGING] Partener demonstrativ', 'https://example.org', 'partener', 10, true),
  ('33111111-1111-4111-8111-222222222222', '[STAGING] Susținător demonstrativ', 'https://example.org', 'sustinator', 20, true)
on conflict (id) do update set
  name = excluded.name,
  url = excluded.url,
  tier = excluded.tier,
  sort = excluded.sort,
  active = excluded.active;

insert into public.site_content (key, value) values
  ('impact_members', '{"value":"TEST 42"}'::jsonb),
  ('impact_projects', '{"value":"TEST 7"}'::jsonb),
  ('impact_volunteer_hours', '{"value":"TEST 320"}'::jsonb),
  ('impact_beneficiaries', '{"value":"TEST 900"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.contact_messages (
  id, name, email, message, handled
) values (
  '34111111-1111-4111-8111-111111111111',
  '[STAGING] Mesaj demonstrativ',
  'contact@staging.invalid',
  'Mesaj fictiv pentru verificarea formularului de contact și a stării procesat/neprocesat.',
  false
)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  message = excluded.message,
  handled = excluded.handled;

commit;
