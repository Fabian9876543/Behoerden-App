-- ===========================================================================
-- Verhaltenstest der Row Level Security
--
-- Prueft die wichtigste Zusage des Produkts direkt in der Datenbank:
-- Ein Nutzer sieht, aendert und loescht niemals Daten eines anderen Nutzers.
--
-- Anders als tests/integration/rls-policies.test.ts (statische Pruefung der
-- Migrationen) laeuft dieser Test gegen echtes PostgreSQL mit aktiven
-- Policies. Ausfuehrung: npm run test:db
--
-- Der Test schaltet ueber request.jwt.claim.sub zwischen zwei Nutzern um und
-- laeuft als Rolle "authenticated" - nicht als Eigentuemer, denn der wuerde
-- RLS umgehen. Die erste Pruefung stellt genau das sicher.
-- ===========================================================================

\set ON_ERROR_STOP on
\pset pager off
\set QUIET on

-- In echtem Supabase sind diese Grants voreingestellt.
grant usage on schema public, storage, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on storage.objects to authenticated, anon;

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test');

create or replace function assert(ok boolean, label text) returns void
language plpgsql as $$
begin
  if ok then raise notice '  OK    %', label;
  else raise exception 'FEHLGESCHLAGEN: %', label;
  end if;
end; $$;

-- Prueft, dass eine Anweisung an RLS scheitert.
create or replace function assert_denied(stmt text, label text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'FEHLGESCHLAGEN: % (Anweisung ging durch)', label;
exception
  when insufficient_privilege then raise notice '  OK    %', label;
end; $$;

\echo '--- Kontrolle: greift RLS ueberhaupt? ---'
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select assert(current_user = 'authenticated', 'Rolle ist authenticated (kein Superuser)');
select assert(auth.uid() = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'auth.uid() liefert Nutzer A');

\echo '--- Nutzer A legt Daten an ---'
insert into public.cases (id, user_id, title)
values ('11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Vertraulicher Vorgang von A');
insert into public.tasks (user_id, case_id, title)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111', 'Geheime Aufgabe von A');
insert into public.deadlines (user_id, case_id, title, due_date)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        '11111111-1111-4111-8111-111111111111', 'Frist von A', date '2026-10-15');
insert into storage.objects (bucket_id, name)
values ('case-documents',
        'users/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cases/11111111-1111-4111-8111-111111111111/documents/d.pdf');

select assert((select count(*) from public.profiles) = 1,
              'Trigger handle_new_user hat das Profil von A angelegt');
select assert((select count(*) from public.cases) = 1, 'A sieht den eigenen Vorgang');
select assert((select count(*) from public.tasks) = 1, 'A sieht die eigene Aufgabe');
select assert((select count(*) from storage.objects) = 1, 'A sieht die eigene Datei');

select assert_denied(
  $q$insert into public.cases (user_id, title)
     values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Untergeschoben')$q$,
  'A kann keine Zeile im Namen von B anlegen');
select assert_denied(
  $q$insert into storage.objects (bucket_id, name)
     values ('case-documents', 'users/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cases/x/documents/d.pdf')$q$,
  'A kann nicht in den Storage-Ordner von B schreiben');

\echo '--- Nutzer B versucht zuzugreifen ---'
set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select assert((select count(*) from public.cases) = 0, 'B sieht den Vorgang von A nicht');
select assert((select count(*) from public.tasks) = 0, 'B sieht die Aufgaben von A nicht');
select assert((select count(*) from public.deadlines) = 0, 'B sieht die Fristen von A nicht');
select assert((select count(*) from public.profiles
               where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 0,
              'B sieht das Profil von A nicht');
select assert((select count(*) from public.profiles
               where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') = 1,
              'B sieht sein eigenes Profil');
select assert((select count(*) from storage.objects) = 0, 'B sieht die Datei von A nicht');

update public.cases set title = 'Uebernommen';
delete from public.cases;
delete from public.tasks;
delete from storage.objects;

insert into public.cases (user_id, title)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Vorgang von B');
select assert((select count(*) from public.cases) = 1, 'B sieht den eigenen Vorgang');
select public.delete_my_data();
select assert((select count(*) from public.cases) = 0, 'delete_my_data loescht die Daten von B');

\echo '--- Kontrolle bei Nutzer A ---'
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select assert((select count(*) from public.cases) = 1, 'Vorgang von A ueberlebt Update und Delete durch B');
select assert((select title from public.cases limit 1) = 'Vertraulicher Vorgang von A',
              'Titel von A ist unveraendert');
select assert((select count(*) from public.tasks) = 1, 'Aufgabe von A ueberlebt delete_my_data von B');
select assert((select count(*) from storage.objects) = 1, 'Datei von A ueberlebt Delete durch B');
select assert((select count(*) from public.profiles
               where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 1,
              'Profil von A ueberlebt delete_my_data von B');
select assert((select count(*) from public.profiles) = 1,
              'A sieht ausschliesslich das eigene Profil');

\echo '--- Kaskaden und anonymer Zugriff ---'
delete from public.cases where id = '11111111-1111-4111-8111-111111111111';
select assert((select count(*) from public.tasks) = 0, 'Vorgang loeschen raeumt Aufgaben mit ab');
select assert((select count(*) from public.deadlines) = 0, 'Vorgang loeschen raeumt Fristen mit ab');

set role anon;
set request.jwt.claim.sub = '';
select assert((select count(*) from public.cases) = 0, 'Anonym sieht keine Vorgaenge');
select assert((select count(*) from public.profiles) = 0, 'Anonym sieht keine Profile');

reset role;
\echo ''
\echo 'Alle RLS-Pruefungen bestanden.'
