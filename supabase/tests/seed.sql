-- ===========================================================================
-- Prüft die Demo-Daten aus supabase/seed/demo-case.sql.
--
-- Die Seed-Datei ist eine Kette datenverändernder CTEs. Ob dabei wirklich
-- alles geschrieben und richtig verknüpft wird, sieht man dem SQL nicht an -
-- darum wird es hier nachgerechnet.
--
-- Erwartet wird der Beispielfall aus der Produktspezifikation:
-- Jobcenter, Weiterbewilligung, Frist 15.10.2026, 3 Aufgaben,
-- 2 erforderliche Unterlagen, 1 Behördenbrief.
--
-- Wird von scripts/test-db.sh aufgerufen, nachdem der Seed gelaufen ist.
-- ===========================================================================

\set ON_ERROR_STOP on
\set QUIET on

\set demo_user '''cccccccc-cccc-4ccc-8ccc-cccccccccccc'''

select assert((select count(*) from public.cases where user_id = :demo_user) = 1,
              'Demo: ein Vorgang angelegt');
select assert((select count(*) from public.documents where user_id = :demo_user) = 1,
              'Demo: ein Behördenbrief angelegt');
select assert((select count(*) from public.deadlines where user_id = :demo_user) = 1,
              'Demo: eine Frist angelegt');
select assert((select count(*) from public.tasks where user_id = :demo_user) = 3,
              'Demo: drei Aufgaben angelegt');
select assert((select count(*) from public.required_documents where user_id = :demo_user) = 2,
              'Demo: zwei erforderliche Unterlagen angelegt');
select assert((select count(*) from public.forms where user_id = :demo_user) = 1,
              'Demo: ein Formular angelegt');
select assert((select count(*) from public.case_events where user_id = :demo_user) = 5,
              'Demo: fünf Timeline-Einträge angelegt');

select assert((select due_date from public.deadlines where user_id = :demo_user) = date '2026-10-15',
              'Demo: Frist ist der 15.10.2026');
select assert((select authority_key from public.cases where user_id = :demo_user) = 'jobcenter',
              'Demo: Behörde ist das Jobcenter');
select assert((select status from public.cases where user_id = :demo_user) = 'action_required',
              'Demo: Vorgang verlangt eine Aktion');

-- Die Verknüpfungen entstehen quer durch die CTE-Kette - genau hier würde
-- ein Fehler in der Reihenfolge auffallen.
select assert((select count(*) from public.tasks
               where user_id = :demo_user and deadline_id is not null) = 3,
              'Demo: alle Aufgaben hängen an der Frist');
select assert((select count(*) from public.tasks
               where user_id = :demo_user and source_document_id is not null) = 3,
              'Demo: alle Aufgaben verweisen auf den Brief');
select assert((select count(*) from public.deadlines
               where user_id = :demo_user and source_document_id is not null) = 1,
              'Demo: die Frist verweist auf den Brief');
select assert((select count(*) from public.required_documents
               where user_id = :demo_user and source_document_id is not null) = 2,
              'Demo: die Unterlagen verweisen auf den Brief');

-- Nachvollziehbarkeit: ohne Beleg keine Frist.
select assert((select source_text is not null and source_page is not null
               from public.deadlines where user_id = :demo_user),
              'Demo: die Frist trägt Zitat und Seitenzahl');
select assert((select source_kind from public.forms where user_id = :demo_user) = 'official_catalog',
              'Demo: das Formular verweist auf eine offizielle Quelle');

-- Demo-Daten müssen als solche erkennbar sein.
select assert((select is_demo from public.cases where user_id = :demo_user),
              'Demo: der Vorgang ist als Demo markiert');
select assert((select is_demo from public.documents where user_id = :demo_user),
              'Demo: der Brief ist als Demo markiert');
