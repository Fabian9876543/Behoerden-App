# Seed-Daten

Die Demo-Daten werden **pro Nutzer** ueber die Anwendung erzeugt
(`app/actions/demo.ts`, Button „Beispiel-Vorgang ansehen" auf dem Dashboard).

Das ist Absicht: Alle Tabellen sind user-scoped und durch Row Level Security
geschuetzt. Ein globaler SQL-Seed muesste eine feste `user_id` kennen und
wuerde entweder RLS umgehen oder an einer fremden ID haengen.

`demo-case.sql` liegt trotzdem bei, falls Demo-Daten fuer einen konkreten
Testnutzer direkt in der Datenbank gebraucht werden (z.B. in einer
Testpipeline). Die User-ID muss dabei explizit gesetzt werden.

```bash
# User-ID ermitteln
supabase db execute "select id, email from auth.users;"

# Demo-Vorgang fuer diesen Nutzer anlegen
psql "$DATABASE_URL" -v user_id="'<UUID>'" -f supabase/seed/demo-case.sql
```

Alle so erzeugten Zeilen tragen `is_demo = true` und werden in der Oberflaeche
mit dem Hinweis „Demo" gekennzeichnet.
