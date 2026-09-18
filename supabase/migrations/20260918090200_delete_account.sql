-- ===========================================================================
-- DSGVO: "Alle meine Daten löschen"
--
-- Löscht sämtliche Fachdaten des aufrufenden Nutzers. Storage-Objekte
-- werden separat von der Anwendung entfernt (siehe lib/storage/documents.ts),
-- da SQL keinen Zugriff auf die Storage-API hat.
--
-- Das Auth-Konto selbst wird über den Service-Role-Key gelöscht.
-- ===========================================================================

create or replace function public.delete_my_data()
returns void
language plpgsql
security invoker
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Reihenfolge respektiert die Fremdschlüssel; RLS begrenzt zusätzlich
  -- jede Anweisung auf die eigenen Zeilen.
  delete from public.case_events        where user_id = uid;
  delete from public.generated_letters  where user_id = uid;
  delete from public.forms              where user_id = uid;
  delete from public.required_documents where user_id = uid;
  delete from public.tasks              where user_id = uid;
  delete from public.deadlines          where user_id = uid;
  delete from public.document_analysis  where user_id = uid;
  delete from public.documents          where user_id = uid;
  delete from public.cases              where user_id = uid;

  update public.profiles
    set first_name = null,
        last_name = null,
        phone = null,
        street = null,
        postal_code = null,
        city = null,
        onboarding_completed_at = null
  where id = uid;
end;
$$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;
