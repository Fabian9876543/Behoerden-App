-- ===========================================================================
-- BehördenBuddy - Initiales Schema
--
-- Grundregeln:
--   * Jede Tabelle ist user-scoped (Spalte user_id -> auth.users).
--   * Row Level Security ist auf JEDER Tabelle aktiv, ohne Ausnahme.
--   * Es gibt keine Policy, die Zeilen anderer Nutzer sichtbar macht.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type case_status as enum (
  'action_required',   -- Aktion erforderlich
  'waiting_on_user',   -- Wartet auf Nutzer
  'waiting_on_authority', -- Wartet auf Behörde
  'in_progress',       -- In Bearbeitung
  'completed'          -- Abgeschlossen
);

create type case_priority as enum ('low', 'normal', 'high', 'critical');

create type task_status as enum ('open', 'in_progress', 'completed', 'dismissed');

create type deadline_status as enum ('upcoming', 'due_soon', 'overdue', 'met', 'dismissed');

create type document_status as enum (
  'uploaded',    -- Datei gespeichert
  'extracting',  -- Text wird extrahiert
  'analyzing',   -- Claude analysiert
  'analyzed',    -- fertig
  'failed'       -- Fehler (siehe error_message)
);

create type document_source as enum ('upload', 'scan', 'demo');

create type letter_status as enum ('draft', 'approved', 'sent', 'discarded');

create type household_mode as enum ('personal', 'family');

-- ---------------------------------------------------------------------------
-- updated_at Trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  street text,
  postal_code text,
  city text,
  household_mode household_mode not null default 'personal',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Minimales Nutzerprofil. Nur Daten, die später zum Vorbefüllen von Formularen gebraucht werden.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Profil automatisch anlegen, sobald sich jemand registriert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  authority_name text,
  authority_key text,               -- stabiler Schlüssel aus lib/authorities
  case_type text,                   -- z.B. 'weiterbewilligung'
  reference_number text,            -- Aktenzeichen / BG-Nummer
  status case_status not null default 'in_progress',
  priority case_priority not null default 'normal',
  summary text,
  is_demo boolean not null default false,
  closed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_user_id_idx on public.cases(user_id);
create index cases_user_status_idx on public.cases(user_id, status);

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  status document_status not null default 'uploaded',
  source document_source not null default 'upload',
  page_count integer,
  -- Extrahierter Text. Hochsensibel: nur über RLS erreichbar, nie geloggt.
  extracted_text text,
  extraction_method text,           -- 'pdf-text' | 'ocr:claude-vision' | 'demo'
  document_date date,
  error_message text,               -- nutzerlesbare Fehlermeldung, kein Stacktrace
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_id_idx on public.documents(user_id);
create index documents_case_id_idx on public.documents(case_id);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_analysis  (strukturiertes Claude-Ergebnis, 1:1 zu documents)
-- ---------------------------------------------------------------------------
create table public.document_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null unique references public.documents(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  model text not null,
  schema_version integer not null default 1,
  -- Vollständiges, gegen das Zod-Schema validiertes Analyseergebnis.
  result jsonb not null,
  document_type text,
  authority_name text,
  authority_confidence numeric(3, 2),
  summary text,
  uncertainty_notes text[] not null default '{}',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

create index document_analysis_user_id_idx on public.document_analysis(user_id);
create index document_analysis_case_id_idx on public.document_analysis(case_id);

-- ---------------------------------------------------------------------------
-- deadlines
-- ---------------------------------------------------------------------------
create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  title text not null,
  description text,
  due_date date not null,
  status deadline_status not null default 'upcoming',
  -- Evidence / Nachvollziehbarkeit
  source_text text,                 -- Originalzitat aus dem Dokument
  source_page integer,
  confidence numeric(3, 2),
  extracted_at timestamptz,
  -- Erinnerungen: im MVP nur In-App. Struktur ist auf Mail/Push vorbereitet.
  reminder_days_before integer[] not null default '{7,1}',
  reminder_channels text[] not null default '{in_app}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deadlines_user_id_idx on public.deadlines(user_id);
create index deadlines_case_id_idx on public.deadlines(case_id);
create index deadlines_due_date_idx on public.deadlines(user_id, due_date);

create trigger deadlines_set_updated_at
  before update on public.deadlines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  deadline_id uuid references public.deadlines(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'open',
  is_required boolean not null default true,
  due_date date,
  position integer not null default 0,
  -- Evidence
  source_text text,
  source_page integer,
  confidence numeric(3, 2),
  generated_by text not null default 'ai',  -- 'ai' | 'user' | 'demo'
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_case_id_idx on public.tasks(case_id);
create index tasks_open_idx on public.tasks(user_id, status);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- required_documents  (welche Unterlagen der Nutzer beibringen muss)
-- ---------------------------------------------------------------------------
create table public.required_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  name text not null,
  description text,
  is_required boolean not null default true,
  fulfilled_by_document_id uuid references public.documents(id) on delete set null,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index required_documents_case_id_idx on public.required_documents(case_id);

create trigger required_documents_set_updated_at
  before update on public.required_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- forms  (erkannte Formulare + offizielle Quelle)
-- ---------------------------------------------------------------------------
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  name text not null,
  form_number text,
  description text,
  official_url text,
  -- 'official_catalog' = aus hinterlegtem Katalog, 'unverified' = nur KI-Nennung.
  source_kind text not null default 'unverified',
  source_label text,
  authority_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forms_source_kind_check
    check (source_kind in ('official_catalog', 'authority_website', 'unverified'))
);

create index forms_case_id_idx on public.forms(case_id);

create trigger forms_set_updated_at
  before update on public.forms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- generated_letters  (Antwortentwürfe)
-- ---------------------------------------------------------------------------
create table public.generated_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  subject text not null,
  body text not null,
  intent text,                      -- z.B. 'fristverlängerung'
  model text,
  status letter_status not null default 'draft',
  -- Ein Entwurf gilt erst als bestätigt, wenn der Nutzer ihn ausdrücklich
  -- freigibt. Es wird nie automatisch etwas versendet.
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generated_letters_case_id_idx on public.generated_letters(case_id);

create trigger generated_letters_set_updated_at
  before update on public.generated_letters
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- case_events  (Timeline)
-- ---------------------------------------------------------------------------
create table public.case_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  -- Nur nicht-sensible Metadaten (IDs, Zähler). Keine Dokumentinhalte.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index case_events_case_id_idx on public.case_events(case_id, created_at desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles           enable row level security;
alter table public.cases              enable row level security;
alter table public.documents          enable row level security;
alter table public.document_analysis  enable row level security;
alter table public.deadlines          enable row level security;
alter table public.tasks              enable row level security;
alter table public.required_documents enable row level security;
alter table public.forms              enable row level security;
alter table public.generated_letters  enable row level security;
alter table public.case_events        enable row level security;

-- profiles: id IS die user_id
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- Alle übrigen Tabellen folgen demselben Muster über user_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'cases', 'documents', 'document_analysis', 'deadlines', 'tasks',
    'required_documents', 'forms', 'generated_letters', 'case_events'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;
