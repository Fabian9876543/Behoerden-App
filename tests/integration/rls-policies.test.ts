import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Statische Sicherheitspruefung der Migrationen.
 *
 * Laeuft ohne Datenbank und schuetzt vor dem gefaehrlichsten Fehler in
 * diesem Projekt: eine Tabelle mit personenbezogenen Daten ohne RLS.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function readAllMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"))
    .join("\n");
}

const USER_SCOPED_TABLES = [
  "profiles",
  "cases",
  "documents",
  "document_analysis",
  "deadlines",
  "tasks",
  "required_documents",
  "forms",
  "generated_letters",
  "case_events",
];

describe("Datenbankmigrationen", () => {
  const sql = readAllMigrations();

  it.each(USER_SCOPED_TABLES)("aktiviert RLS auf %s", (table) => {
    expect(sql).toMatch(
      new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
    );
  });

  it.each(USER_SCOPED_TABLES.filter((t) => t !== "profiles"))(
    "%s traegt eine user_id mit Fremdschluessel auf auth.users",
    (table) => {
      const createStatement = new RegExp(
        `create\\s+table\\s+public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
        "i",
      ).exec(sql);
      expect(createStatement, `CREATE TABLE fuer ${table} nicht gefunden`).not.toBeNull();
      expect(createStatement![1]).toMatch(
        /user_id\s+uuid\s+not\s+null\s+references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i,
      );
    },
  );

  it("bindet jede Policy an auth.uid()", () => {
    // Policies werden teils in einer Schleife erzeugt; beide Formen pruefen.
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*id/i);
  });

  it("enthaelt keine Policy, die alle Zeilen freigibt", () => {
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/to\s+anon/i);
  });

  it("legt den Dokumentbucket als privat an", () => {
    expect(sql).toMatch(/insert\s+into\s+storage\.buckets[\s\S]*?'case-documents'/i);
    // Der Bucket darf nie oeffentlich werden - auch nicht beim erneuten Anlegen.
    expect(sql).toMatch(/set\s+public\s*=\s*false/i);
    expect(sql).not.toMatch(/'case-documents',\s*true/i);
  });

  it("begrenzt Storage-Policies auf den eigenen Ordner", () => {
    const storagePolicies = sql.match(/create\s+policy[\s\S]*?on\s+storage\.objects[\s\S]*?;/gi);
    expect(storagePolicies?.length).toBeGreaterThanOrEqual(4);
    for (const policy of storagePolicies ?? []) {
      expect(policy).toMatch(/storage\.foldername\(name\)\)\[2\]\s*=\s*auth\.uid\(\)::text/i);
      expect(policy).toMatch(/to\s+authenticated/i);
    }
  });

  it("erlaubt nur unterstuetzte Dateitypen im Bucket", () => {
    expect(sql).toMatch(/allowed_mime_types/i);
    expect(sql).toMatch(/application\/pdf/i);
    expect(sql).not.toMatch(/application\/x-msdownload/i);
  });

  it("stellt die Loeschfunktion nur Angemeldeten zur Verfuegung", () => {
    expect(sql).toMatch(/create\s+or\s+replace\s+function\s+public\.delete_my_data/i);
    expect(sql).toMatch(/revoke\s+all\s+on\s+function\s+public\.delete_my_data\(\)\s+from\s+public/i);
    expect(sql).toMatch(/grant\s+execute\s+on\s+function\s+public\.delete_my_data\(\)\s+to\s+authenticated/i);
  });

  it("laesst delete_my_data als aufrufenden Nutzer laufen, damit RLS greift", () => {
    const fn = /create\s+or\s+replace\s+function\s+public\.delete_my_data[\s\S]*?\$\$;/i.exec(sql);
    expect(fn).not.toBeNull();
    expect(fn![0]).toMatch(/security\s+invoker/i);
    expect(fn![0]).not.toMatch(/security\s+definer/i);
  });
});
