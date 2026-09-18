-- ===========================================================================
-- Testharness: minimale Nachbildung der Supabase-Umgebung
--
-- Wird NUR gebraucht, um die Migrationen gegen ein nacktes PostgreSQL zu
-- prüfen (scripts/test-db.sh, CI ohne Docker). Eine echte Supabase-Instanz
-- bringt auth, storage und die Rollen bereits mit - dort diese Datei NICHT
-- einspielen.
-- ===========================================================================

create schema if not exists auth;
create schema if not exists storage;
create extension if not exists "pgcrypto";

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- In Supabase stammt die ID aus dem JWT. Hier aus einer Session-Variable,
-- damit der Test zwischen Nutzern umschalten kann.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Entspricht dem Verhalten von Supabase: Pfad ohne Dateinamen, an "/" zerlegt.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end $$;
