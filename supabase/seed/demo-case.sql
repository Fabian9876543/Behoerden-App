-- ===========================================================================
-- Demo-Vorgang: Jobcenter / Weiterbewilligung
--
-- Aufruf mit expliziter User-ID:
--   psql "$DATABASE_URL" -v user_id="'<UUID>'" -f supabase/seed/demo-case.sql
--
-- Alle Zeilen sind mit is_demo = true markiert und in der Oberfläche klar
-- als Demo erkennbar. Es wird bewusst KEINE Datei im Storage angelegt.
-- ===========================================================================

\set ON_ERROR_STOP on

begin;

with demo_case as (
  insert into public.cases (
    user_id, title, authority_name, authority_key, case_type,
    reference_number, status, priority, summary, is_demo
  )
  values (
    :user_id,
    '[Demo] Weiterbewilligung Bürgergeld',
    'Jobcenter',
    'jobcenter',
    'weiterbewilligung',
    'DEMO-12345/2026',
    'action_required',
    'critical',
    'Beispielvorgang: Das Jobcenter fordert zur Weiterbewilligung der Leistungen '
      || 'Unterlagen an. Der Weiterbewilligungsantrag und die Nachweise müssen bis '
      || 'zum 15.10.2026 eingereicht werden.',
    true
  )
  returning id
),
demo_document as (
  insert into public.documents (
    user_id, case_id, file_name, mime_type, size_bytes, storage_path,
    status, source, page_count, extraction_method, document_date, is_demo, extracted_text
  )
  select
    :user_id,
    demo_case.id,
    'Demo-Schreiben-Jobcenter.pdf',
    'application/pdf',
    0,
    'demo/' || :user_id || '/' || gen_random_uuid() || '.pdf',
    'analyzed',
    'demo',
    2,
    'demo',
    date '2026-09-18',
    true,
    E'--- Seite 1 ---\nJobcenter Musterstadt\nAktenzeichen: DEMO-12345/2026\n'
      || E'Datum: 18.09.2026\n\nWeiterbewilligung Ihres Anspruchs auf Bürgergeld\n\n'
      || E'Ihr aktueller Bewilligungszeitraum endet am 31.10.2026. Reichen Sie bitte '
      || E'den Weiterbewilligungsantrag sowie die unten genannten Unterlagen bis zum '
      || E'15.10.2026 bei uns ein.\n\n--- Seite 2 ---\nBenötigte Unterlagen:\n'
      || E'- Kontoauszüge der letzten drei Monate aller Konten\n'
      || E'- Aktuelle Mietbescheinigung bzw. Nachweis der Kosten der Unterkunft\n\n'
      || E'Bitte verwenden Sie den beiliegenden Weiterbewilligungsantrag (WBA).'
  from demo_case
  returning id, case_id
),
demo_deadline as (
  insert into public.deadlines (
    user_id, case_id, source_document_id, title, description, due_date,
    status, source_text, source_page, confidence, extracted_at
  )
  select
    :user_id,
    demo_document.case_id,
    demo_document.id,
    'Weiterbewilligungsantrag einreichen',
    'Frist zur Einreichung des Weiterbewilligungsantrags samt Nachweisen.',
    date '2026-10-15',
    'upcoming',
    'reichen Sie bitte den Weiterbewilligungsantrag sowie die unten genannten '
      || 'Unterlagen bis zum 15.10.2026 bei uns ein',
    1,
    0.95,
    now()
  from demo_document
  returning id, case_id, source_document_id
),
demo_tasks as (
  insert into public.tasks (
    user_id, case_id, source_document_id, deadline_id, title, description,
    is_required, due_date, position, source_text, source_page, confidence, generated_by
  )
  select
    :user_id,
    demo_deadline.case_id,
    demo_deadline.source_document_id,
    demo_deadline.id,
    task.title,
    task.description,
    true,
    date '2026-10-15',
    task.position,
    task.source_text,
    task.source_page,
    task.confidence,
    'demo'
  from demo_deadline
  cross join (values
    (
      'Weiterbewilligungsantrag (WBA) ausfüllen',
      'Den Weiterbewilligungsantrag vollständig ausfüllen und unterschreiben.',
      0, 'Bitte verwenden Sie den beiliegenden Weiterbewilligungsantrag (WBA).', 2, 0.92
    ),
    (
      'Kontoauszüge der letzten drei Monate hochladen',
      'Auszüge aller Konten, lückenlos für die letzten drei Monate.',
      1, 'Kontoauszüge der letzten drei Monate aller Konten', 2, 0.94
    ),
    (
      'Aktuelle Mietbescheinigung beschaffen',
      'Nachweis über die Kosten der Unterkunft, von der Vermietung ausgefüllt.',
      2, 'Aktuelle Mietbescheinigung bzw. Nachweis der Kosten der Unterkunft', 2, 0.90
    )
  ) as task(title, description, position, source_text, source_page, confidence)
  returning case_id
),
demo_required as (
  insert into public.required_documents (
    user_id, case_id, source_document_id, name, description, is_required
  )
  select
    :user_id, demo_document.case_id, demo_document.id, item.name, item.description, true
  from demo_document
  cross join (values
    ('Kontoauszüge der letzten drei Monate', 'Alle Konten, lückenlos.'),
    ('Mietbescheinigung', 'Nachweis der Kosten der Unterkunft.')
  ) as item(name, description)
  returning case_id
),
demo_form as (
  insert into public.forms (
    user_id, case_id, name, form_number, description,
    official_url, source_kind, source_label, authority_key
  )
  select
    :user_id,
    demo_case.id,
    'Weiterbewilligungsantrag Bürgergeld',
    'WBA',
    'Antrag auf Weiterbewilligung der Leistungen nach dem SGB II.',
    'https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld',
    'official_catalog',
    'Bundesagentur für Arbeit',
    'jobcenter'
  from demo_case
  returning case_id
)
insert into public.case_events (user_id, case_id, event_type, title, metadata)
select :user_id, demo_case.id, event.type, event.title, event.metadata::jsonb
from demo_case
cross join (values
  ('case_created', 'Demo-Vorgang angelegt', '{"demo": true}'),
  ('document_uploaded', 'Dokument hochgeladen', '{"demo": true}'),
  ('authority_detected', 'Behörde erkannt: Jobcenter', '{"confidence": 0.96}'),
  ('deadline_detected', 'Frist erkannt: 15.10.2026', '{"count": 1}'),
  ('tasks_created', '3 Aufgaben erstellt', '{"count": 3}')
) as event(type, title, metadata);

commit;
