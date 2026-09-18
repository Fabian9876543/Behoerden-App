import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORITIES, OFFICIAL_SOURCE_PRIORITY } from "@/lib/authorities/registry";
import { FORM_CATALOG } from "@/lib/forms/catalog";
import { MUNICIPALITIES, normalizePlace } from "@/lib/authorities/municipalities";

/**
 * Wächter über technische Bezeichner und URLs.
 *
 * Die Oberfläche ist auf echte Umlaute umgestellt worden - und eine
 * Sammelersetzung hat dabei auch Behördenschlüssel und URLs erwischt. Aus
 * "buergeramt" wurde ein Schlüssel mit Umlaut, aus einer echten Adresse eine
 * tote. Schlüssel landen in der Datenbank, URLs sind das Versprechen dieses
 * Produkts auf offizielle Quellen - beides darf nie wieder stillschweigend
 * verrutschen.
 */

const NON_ASCII = /[^\x20-\x7E]/;

function collectSources(): { file: string; content: string }[] {
  const files: { file: string; content: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry === ".next") continue;
        walk(full);
      } else if (/\.(ts|tsx|sql)$/.test(entry)) {
        files.push({ file: full, content: readFileSync(full, "utf8") });
      }
    }
  };
  for (const root of ["app", "components", "lib", "supabase", "tests"]) walk(root);
  return files;
}

describe("Behördenschlüssel", () => {
  it.each(AUTHORITIES.map((authority) => [authority.key] as const))(
    "%s besteht nur aus ASCII",
    (key) => {
      expect(NON_ASCII.test(key)).toBe(false);
    },
  );

  it("verwendet nur Kleinbuchstaben und Unterstriche", () => {
    for (const authority of AUTHORITIES) {
      expect(authority.key, authority.name).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("die Aliase dürfen dagegen Umlaute tragen", () => {
    // Sie sind Suchbegriffe, keine Bezeichner - normalize() gleicht beide
    // Seiten an, bevor verglichen wird.
    const aliases = AUTHORITIES.flatMap((authority) => authority.aliases);
    expect(aliases.some((alias) => NON_ASCII.test(alias))).toBe(true);
  });

  it("führt keinen Alias doppelt", () => {
    for (const authority of AUTHORITIES) {
      expect(new Set(authority.aliases).size, authority.key).toBe(authority.aliases.length);
    }
  });
});

describe("Formularkatalog", () => {
  it("verweist nur auf Schlüssel, die es in der Registry gibt", () => {
    const keys = new Set(AUTHORITIES.map((authority) => authority.key));
    for (const form of FORM_CATALOG) {
      expect(keys.has(form.authorityKey), `${form.name} -> ${form.authorityKey}`).toBe(true);
    }
  });
});

describe("Gemeindekatalog", () => {
  it("hat ASCII-Schlüssel", () => {
    for (const entry of MUNICIPALITIES) {
      expect(entry.key, entry.name).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("vergibt jeden Schlüssel nur einmal", () => {
    const keys = MUNICIPALITIES.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("führt nur HTTPS-Adressen auf .de", () => {
    for (const entry of MUNICIPALITIES) {
      const url = new URL(entry.url);
      expect(url.protocol, entry.name).toBe("https:");
      expect(url.hostname, entry.name).toMatch(/^[a-z0-9.-]+\.de$/);
    }
  });

  it("verlinkt nur Domain-Wurzeln, keine Unterseiten", () => {
    // Pfade veralten, Domains nicht. Ein toter Direktlink ist schlimmer als
    // ein Klick mehr - siehe Kommentar im Katalog.
    for (const entry of MUNICIPALITIES) {
      const url = new URL(entry.url);
      expect(url.pathname, entry.name).toBe("/");
      expect(url.search, entry.name).toBe("");
    }
  });

  it("nennt zu jedem mehrdeutigen Namen auch PLZ-Bereiche", () => {
    for (const entry of MUNICIPALITIES) {
      if (!entry.ambiguousAliases?.length) continue;
      expect(entry.postalPrefixes?.length ?? 0, entry.name).toBeGreaterThan(0);
      for (const prefix of entry.postalPrefixes ?? []) {
        expect(prefix, entry.name).toMatch(/^\d{1,4}$/);
      }
    }
  });

  it("verwendet keinen eindeutigen Namen doppelt", () => {
    // Verglichen wird in der Form, in der auch gesucht wird - sonst bleibt
    // ein "Frankfurt am Main" neben "frankfurt am main" unentdeckt.
    const seen = new Map<string, string>();
    for (const entry of MUNICIPALITIES) {
      for (const name of [entry.name, ...(entry.aliases ?? [])]) {
        const key = normalizePlace(name);
        expect(seen.get(key), `${name} doppelt`).toBeUndefined();
        seen.set(key, entry.key);
      }
    }
  });

  it("kein mehrdeutiger Alias ist anderswo ein eindeutiger Name", () => {
    // Sonst gewänne der eindeutige Treffer, und die PLZ-Prüfung fände nie
    // statt - genau die soll den Ort aber entscheiden.
    const exact = new Set(
      MUNICIPALITIES.flatMap((entry) =>
        [entry.name, ...(entry.aliases ?? [])].map(normalizePlace),
      ),
    );
    for (const entry of MUNICIPALITIES) {
      for (const alias of entry.ambiguousAliases ?? []) {
        expect(exact.has(normalizePlace(alias)), `${alias} (${entry.key})`).toBe(false);
      }
    }
  });
});

describe("URLs", () => {
  const urlPattern = /https?:\/\/[^\s"'`)]+/g;

  it("enthalten im gesamten Quelltext keine Umlaute", () => {
    const broken: string[] = [];
    for (const { file, content } of collectSources()) {
      for (const url of content.match(urlPattern) ?? []) {
        if (NON_ASCII.test(url)) broken.push(`${file}: ${url}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("sind in Registry und Katalog gültige Adressen", () => {
    const urls = [
      ...AUTHORITIES.map((authority) => authority.officialUrl).filter(Boolean),
      ...FORM_CATALOG.map((form) => form.officialUrl),
      ...MUNICIPALITIES.map((entry) => entry.url),
    ] as string[];

    for (const url of urls) {
      expect(() => new URL(url), url).not.toThrow();
      expect(new URL(url).hostname, url).toMatch(/^[a-z0-9.-]+$/);
    }
  });

  it("die Prioritätenliste enthält nur reine Hostnamen", () => {
    for (const domain of OFFICIAL_SOURCE_PRIORITY) {
      expect(domain, domain).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});
