-- ===========================================================================
-- Familienmodus: Wen betrifft der Vorgang?
--
-- Wer im Onboarding "Für meine Familie" wählt, verwaltet auch Post, die
-- Kinder oder Angehörige betrifft. Ohne eine Zuordnung ist in einer längeren
-- Liste nicht mehr erkennbar, wessen Angelegenheit ein Vorgang ist.
--
-- Bewusst ein Freitextfeld und keine Personenverwaltung: Es gibt im MVP keine
-- geteilten Konten: Der Vorgang gehört weiterhin ausschließlich dem
-- anlegenden Nutzer, und die bestehende RLS-Policy gilt unverändert weiter.
-- ===========================================================================

alter table public.cases
  add column if not exists concerns text;

comment on column public.cases.concerns is
  'Freitext: wen der Vorgang betrifft, z.B. "Tochter Lena". Nur im Familienmodus sichtbar.';
