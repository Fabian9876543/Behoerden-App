import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/types/database";

/**
 * Echter Autorisierungstest gegen Supabase.
 *
 * Er beweist die wichtigste Zusage des Produkts: Ein Nutzer sieht niemals
 * Daten eines anderen Nutzers.
 *
 * Voraussetzung: lokale Supabase-Instanz (`supabase start`) mit
 * NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY und
 * SUPABASE_SERVICE_ROLE_KEY. Ohne diese Variablen wird der Test uebersprungen.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(url && anonKey && serviceKey);

const suite = configured ? describe : describe.skip;

suite("Row Level Security gegen eine echte Datenbank", () => {
  const password = "Test-Passwort-2026!";
  const emailA = `rls-a-${randomUUID()}@example.test`;
  const emailB = `rls-b-${randomUUID()}@example.test`;

  let admin: SupabaseClient<Database>;
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let userIdA = "";
  let userIdB = "";
  let caseIdA = "";

  async function signUp(email: string) {
    const client = createClient<Database>(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Kein Nutzer angelegt");
    return { client, userId: data.user.id };
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const a = await signUp(emailA);
    const b = await signUp(emailB);
    clientA = a.client;
    clientB = b.client;
    userIdA = a.userId;
    userIdB = b.userId;

    const { data, error } = await clientA
      .from("cases")
      .insert({ user_id: userIdA, title: "Vertraulicher Vorgang von A" })
      .select("id")
      .single();
    if (error) throw error;
    caseIdA = data.id;

    await clientA.from("tasks").insert({
      user_id: userIdA,
      case_id: caseIdA,
      title: "Geheime Aufgabe von A",
    });
    await clientA.from("deadlines").insert({
      user_id: userIdA,
      case_id: caseIdA,
      title: "Frist von A",
      due_date: "2026-10-15",
    });
  }, 60_000);

  afterAll(async () => {
    if (!configured) return;
    for (const id of [userIdA, userIdB].filter(Boolean)) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  }, 60_000);

  it("A sieht den eigenen Vorgang", async () => {
    const { data } = await clientA.from("cases").select("*").eq("id", caseIdA);
    expect(data).toHaveLength(1);
  });

  it("B sieht den Vorgang von A nicht", async () => {
    const { data } = await clientB.from("cases").select("*").eq("id", caseIdA);
    expect(data).toEqual([]);
  });

  it("B sieht die Aufgaben von A nicht", async () => {
    const { data } = await clientB.from("tasks").select("*");
    expect(data).toEqual([]);
  });

  it("B sieht die Fristen von A nicht", async () => {
    const { data } = await clientB.from("deadlines").select("*");
    expect(data).toEqual([]);
  });

  it("B kann den Vorgang von A nicht aendern", async () => {
    const { data } = await clientB
      .from("cases")
      .update({ title: "Uebernommen" })
      .eq("id", caseIdA)
      .select("id");
    expect(data ?? []).toEqual([]);

    const { data: unchanged } = await clientA.from("cases").select("title").eq("id", caseIdA);
    expect(unchanged?.[0]?.title).toBe("Vertraulicher Vorgang von A");
  });

  it("B kann den Vorgang von A nicht loeschen", async () => {
    await clientB.from("cases").delete().eq("id", caseIdA);
    const { data } = await clientA.from("cases").select("id").eq("id", caseIdA);
    expect(data).toHaveLength(1);
  });

  it("B kann keine Zeile im Namen von A anlegen", async () => {
    const { error } = await clientB
      .from("cases")
      .insert({ user_id: userIdA, title: "Untergeschoben" });
    expect(error).not.toBeNull();
  });

  it("B sieht das Profil von A nicht", async () => {
    const { data } = await clientB.from("profiles").select("*").eq("id", userIdA);
    expect(data).toEqual([]);
  });

  it("B kann die Datei von A im Storage nicht lesen", async () => {
    const path = `users/${userIdA}/cases/${caseIdA}/documents/${randomUUID()}.pdf`;
    await clientA.storage
      .from("case-documents")
      .upload(path, new Uint8Array([0x25, 0x50, 0x44, 0x46]), { contentType: "application/pdf" });

    const { data, error } = await clientB.storage.from("case-documents").download(path);
    expect(data).toBeNull();
    expect(error).not.toBeNull();

    await clientA.storage.from("case-documents").remove([path]);
  }, 30_000);

  it("delete_my_data loescht nur die eigenen Daten", async () => {
    const { data: caseB } = await clientB
      .from("cases")
      .insert({ user_id: userIdB, title: "Vorgang von B" })
      .select("id")
      .single();

    const { error } = await clientB.rpc("delete_my_data");
    expect(error).toBeNull();

    const { data: remainingB } = await clientB.from("cases").select("id");
    expect(remainingB).toEqual([]);
    expect(caseB).not.toBeNull();

    // Die Daten von A sind unangetastet.
    const { data: remainingA } = await clientA.from("cases").select("id").eq("id", caseIdA);
    expect(remainingA).toHaveLength(1);
  }, 30_000);
});
