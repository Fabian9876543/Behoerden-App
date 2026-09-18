#!/usr/bin/env bash
#
# Prüft die Migrationen und die Row Level Security gegen echtes PostgreSQL.
#
# Startet einen temporaeren Cluster, spielt Harness und Migrationen ein, fuehrt
# supabase/tests/rls.sql aus und räumt danach auf. Braucht kein Docker und
# keine laufende Supabase-Instanz - nur PostgreSQL-Binaries.
#
#   npm run test:db
#
set -euo pipefail

PORT="${PGTEST_PORT:-55432}"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/behoerdenbuddy-pgtest.XXXXXX")"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Als root muss der Server unter einem unprivilegierten Nutzer laufen.
RUN_AS=""
if [ "$(id -u)" -eq 0 ]; then
  if id -u postgres >/dev/null 2>&1; then
    RUN_AS="postgres"
  else
    echo "Als root wird ein Systemnutzer 'postgres' benötigt." >&2
    exit 1
  fi
fi

run() {
  if [ -n "$RUN_AS" ]; then su "$RUN_AS" -c "$*"; else bash -c "$*"; fi
}

find_bin() {
  if command -v "$1" >/dev/null 2>&1; then command -v "$1"; return; fi
  local candidate
  candidate="$(ls -d /usr/lib/postgresql/*/bin/"$1" 2>/dev/null | sort -V | tail -1 || true)"
  if [ -n "$candidate" ]; then echo "$candidate"; return; fi
  echo "PostgreSQL-Binary '$1' nicht gefunden. Bitte PostgreSQL installieren." >&2
  exit 1
}

INITDB="$(find_bin initdb)"
PG_CTL="$(find_bin pg_ctl)"
PSQL="$(find_bin psql)"

cleanup() {
  run "'$PG_CTL' -D '$WORKDIR/data' stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

mkdir -p "$WORKDIR/data" "$WORKDIR/run" "$WORKDIR/sql"
cp "$REPO_ROOT"/supabase/migrations/*.sql "$WORKDIR/sql/"
cp "$REPO_ROOT"/supabase/tests/*.sql "$WORKDIR/sql/"
cp "$REPO_ROOT"/supabase/seed/demo-case.sql "$WORKDIR/sql/"
chmod -R a+rX "$WORKDIR/sql"

if [ -n "$RUN_AS" ]; then
  chown -R "$RUN_AS":"$RUN_AS" "$WORKDIR"
fi
chmod 755 "$WORKDIR"
chmod 700 "$WORKDIR/data"

echo "Starte temporaere Datenbank auf Port $PORT ..."
run "'$INITDB' -D '$WORKDIR/data' -U bb --auth=trust --encoding=UTF8" >/dev/null
run "'$PG_CTL' -D '$WORKDIR/data' -o '-k $WORKDIR/run -p $PORT -c listen_addresses=' -l '$WORKDIR/pg.log' start -w -t 60" >/dev/null

psql_run() {
  run "'$PSQL' -h '$WORKDIR/run' -p $PORT -U bb -d postgres -v ON_ERROR_STOP=1 -q -f '$1'"
}

echo "Spiele Testharness ein ..."
psql_run "$WORKDIR/sql/_harness.sql" >/dev/null

echo "Spiele Migrationen ein ..."
for migration in $(ls "$WORKDIR"/sql/*.sql | grep -vE '/(_harness|rls|seed|demo-case)\.sql$' | sort); do
  echo "  $(basename "$migration")"
  # Ausgabe erst sammeln, dann filtern - so verdeckt kein Filter einen
  # fehlgeschlagenen Migrationslauf.
  if ! psql_run "$migration" >"$WORKDIR/out.log" 2>&1; then
    echo "Migration fehlgeschlagen: $(basename "$migration")" >&2
    cat "$WORKDIR/out.log" >&2
    exit 1
  fi
  grep -viE 'notice|skipping' "$WORKDIR/out.log" | sed 's/^/    /' || true
done

echo "Fuehre RLS-Verhaltenstest aus ..."
if ! psql_run "$WORKDIR/sql/rls.sql" >"$WORKDIR/rls.log" 2>&1; then
  echo "RLS-Verhaltenstest fehlgeschlagen:" >&2
  sed 's/^psql:[^ ]* //;s/^NOTICE:  //' "$WORKDIR/rls.log" >&2
  exit 1
fi

# Nur Rauschen entfernen (leere Zeilen, Spaltenkoepfe, Zeilenzaehler) -
# niemals Zeilen, die eine Zusicherung melden.
grep -vE '^[[:space:]]*$|^ (assert|assert_denied|delete_my_data) *$|^-+$|^\(1 row\)$' \
  "$WORKDIR/rls.log" | sed 's/^psql:[^ ]* //;s/^NOTICE:  //'

# Schutz gegen einen stillschweigend abgebrochenen Lauf: Wenn deutlich
# weniger Zusicherungen gemeldet wurden als erwartet, gilt der Test als
# fehlgeschlagen - auch wenn psql mit 0 endete.
echo "Prüfe die Demo-Daten ..."
DEMO_USER="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
run "'$PSQL' -h '$WORKDIR/run' -p $PORT -U bb -d postgres -v ON_ERROR_STOP=1 -q -c \
  \"insert into auth.users (id, email) values ('$DEMO_USER', 'demo@example.test');\"" >/dev/null

if ! run "'$PSQL' -h '$WORKDIR/run' -p $PORT -U bb -d postgres -v ON_ERROR_STOP=1 -q \
     -v user_id=\"'$DEMO_USER'\" -f '$WORKDIR/sql/demo-case.sql'" >"$WORKDIR/seed.log" 2>&1; then
  echo "Demo-Seed fehlgeschlagen:" >&2
  cat "$WORKDIR/seed.log" >&2
  exit 1
fi

if ! psql_run "$WORKDIR/sql/seed.sql" >>"$WORKDIR/rls.log" 2>&1; then
  echo "Prüfung der Demo-Daten fehlgeschlagen:" >&2
  sed 's/^psql:[^ ]* //;s/^NOTICE:  //' "$WORKDIR/rls.log" | tail -20 >&2
  exit 1
fi
grep -E 'OK {4}' "$WORKDIR/rls.log" | sed 's/^psql:[^ ]* //;s/^NOTICE:  //' | tail -18

ASSERTIONS="$(grep -cE 'OK {4}' "$WORKDIR/rls.log" || true)"
EXPECTED="${PGTEST_MIN_ASSERTIONS:-44}"
if [ "$ASSERTIONS" -lt "$EXPECTED" ]; then
  echo "Nur $ASSERTIONS von mindestens $EXPECTED Zusicherungen gelaufen - Test unvollständig." >&2
  exit 1
fi

echo "Datenbanktests bestanden ($ASSERTIONS Zusicherungen)."
