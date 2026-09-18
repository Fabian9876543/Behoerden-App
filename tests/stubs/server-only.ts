/**
 * Stub fuer das `server-only`-Paket in Tests.
 *
 * `server-only` wirft beim Import ausserhalb einer React-Server-Umgebung.
 * In Vitest wird es deshalb auf dieses leere Modul gemappt (siehe
 * vitest.config.ts). Der Schutz im echten Build bleibt davon unberuehrt -
 * Next.js loest den Alias nicht auf.
 */
export {};
