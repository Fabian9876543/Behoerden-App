import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUTHORITIES, OFFICIAL_SOURCE_PRIORITY } from "@/lib/authorities/registry";
import { FORM_CATALOG } from "@/lib/forms/catalog";

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
