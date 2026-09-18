# Seed-Daten

Die Demo-Daten werden **pro Nutzer** über die Anwendung erzeugt
(`app/actions/demo.ts`, Button „Beispiel-Vorgang ansehen" auf dem Dashboard).

Das ist Absicht: Alle Tabellen sind user-scoped und durch Row Level Security
geschützt. Ein globaler SQL-Seed müsste eine feste `user_id` kennen und
würde entweder RLS umgehen oder an einer fremden ID hängen.

`demo-case.sql` liegt trotzdem bei, falls Demo-Daten für einen konkreten
Testnutzer direkt in der Datenbank gebraucht werden (z.B. in einer
Testpipeline). Die User-ID muss dabei explizit gesetzt werden.

```bash
# User-ID ermitteln
supabase db execute "select id, email from auth.users;"

# Demo-Vorgang für diesen Nutzer anlegen
psql "$DATABASE_URL" -v user_id="'<UUID>'" -f supabase/seed/demo-case.sql
```

Alle so erzeugten Zeilen tragen `is_demo = true` und werden in der Oberfläche
mit dem Hinweis „Demo" gekennzeichnet.
