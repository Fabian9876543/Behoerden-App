/**
 * Stub für das `server-only`-Paket in Tests.
 *
 * `server-only` wirft beim Import außerhalb einer React-Server-Umgebung.
 * In Vitest wird es deshalb auf dieses leere Modul gemappt (siehe
 * vitest.config.ts). Der Schutz im echten Build bleibt davon unberührt -
 * Next.js löst den Alias nicht auf.
 */
export {};
