"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCase } from "@/lib/db/cases";
import { recordCaseEvents } from "@/lib/db/events";

/**
 * Demo-Vorgang.
 *
 * Erzeugt einen vollstaendigen Beispielfall, damit die App auch ohne eigenen
 * Behoerdenbrief erlebbar ist. Alle erzeugten Zeilen tragen `is_demo = true`
 * und sind in der UI als Demo gekennzeichnet.
 *
 * Es wird KEINE Datei im Storage angelegt: Ein Demo-Dokument ohne echte Datei
 * waere ein Dokument, das man nicht oeffnen kann. Stattdessen wird der
 * Beispielbrief als Dokumenteintrag mit Status "analyzed" und hinterlegtem
 * Beispieltext gefuehrt.
 */
export async function createDemoCaseAction(): Promise<ActionResult<{ caseId: string }>> {
  try {
    const user = await requireUser();
    const supabase = await createSupabaseServerClient();

    const now = new Date();
    const deadlineDate = "2026-10-15";
    const letterDate = "2026-09-18";

    const caseRow = await createCase({
      userId: user.id,
      title: "[Demo] Weiterbewilligung Buergergeld",
      authorityName: "Jobcenter",
      authorityKey: "jobcenter",
      caseType: "weiterbewilligung",
      referenceNumber: "DEMO-12345/2026",
      status: "action_required",
      priority: "critical",
      summary:
        "Beispielvorgang: Das Jobcenter fordert zur Weiterbewilligung der Leistungen Unterlagen an. "
        + "Der Weiterbewilligungsantrag und die Nachweise muessen bis zum 15.10.2026 eingereicht werden.",
      isDemo: true,
    });

    const documentId = randomUUID();
    await supabase.from("documents").insert({
      id: documentId,
      user_id: user.id,
      case_id: caseRow.id,
      file_name: "Demo-Schreiben-Jobcenter.pdf",
      mime_type: "application/pdf",
      size_bytes: 0,
      // Kein echtes Objekt im Storage - der Pfad ist als Demo markiert.
      storage_path: `demo/${user.id}/${documentId}.pdf`,
      status: "analyzed",
      source: "demo",
      page_count: 2,
      extraction_method: "demo",
      document_date: letterDate,
      is_demo: true,
      extracted_text:
        "--- Seite 1 ---\n"
        + "Jobcenter Musterstadt\nAktenzeichen: DEMO-12345/2026\nDatum: 18.09.2026\n\n"
        + "Weiterbewilligung Ihres Anspruchs auf Buergergeld\n\n"
        + "Sehr geehrte Damen und Herren,\n\n"
        + "Ihr aktueller Bewilligungszeitraum endet am 31.10.2026. Damit die Leistungen "
        + "ohne Unterbrechung weitergezahlt werden koennen, reichen Sie bitte den "
        + "Weiterbewilligungsantrag sowie die unten genannten Unterlagen bis zum "
        + "15.10.2026 bei uns ein.\n\n"
        + "--- Seite 2 ---\n"
        + "Benoetigte Unterlagen:\n"
        + "- Kontoauszuege der letzten drei Monate aller Konten\n"
        + "- Aktuelle Mietbescheinigung bzw. Nachweis der Kosten der Unterkunft\n\n"
        + "Bitte verwenden Sie den beiliegenden Weiterbewilligungsantrag (WBA).",
    });

    const { data: deadline } = await supabase
      .from("deadlines")
      .insert({
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        title: "Weiterbewilligungsantrag einreichen",
        description:
          "Frist zur Einreichung des Weiterbewilligungsantrags samt Nachweisen.",
        due_date: deadlineDate,
        status: "upcoming",
        source_text:
          "reichen Sie bitte den Weiterbewilligungsantrag sowie die unten genannten "
          + "Unterlagen bis zum 15.10.2026 bei uns ein",
        source_page: 1,
        confidence: 0.95,
        extracted_at: now.toISOString(),
      })
      .select("id")
      .single();

    await supabase.from("tasks").insert([
      {
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        deadline_id: deadline?.id ?? null,
        title: "Weiterbewilligungsantrag (WBA) ausfuellen",
        description: "Den Weiterbewilligungsantrag vollstaendig ausfuellen und unterschreiben.",
        is_required: true,
        due_date: deadlineDate,
        position: 0,
        source_text: "Bitte verwenden Sie den beiliegenden Weiterbewilligungsantrag (WBA).",
        source_page: 2,
        confidence: 0.92,
        generated_by: "demo",
      },
      {
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        deadline_id: deadline?.id ?? null,
        title: "Kontoauszuege der letzten drei Monate hochladen",
        description: "Auszuege aller Konten, lueckenlos fuer die letzten drei Monate.",
        is_required: true,
        due_date: deadlineDate,
        position: 1,
        source_text: "Kontoauszuege der letzten drei Monate aller Konten",
        source_page: 2,
        confidence: 0.94,
        generated_by: "demo",
      },
      {
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        deadline_id: deadline?.id ?? null,
        title: "Aktuelle Mietbescheinigung beschaffen",
        description: "Nachweis ueber die Kosten der Unterkunft, von der Vermietung ausgefuellt.",
        is_required: true,
        due_date: deadlineDate,
        position: 2,
        source_text: "Aktuelle Mietbescheinigung bzw. Nachweis der Kosten der Unterkunft",
        source_page: 2,
        confidence: 0.9,
        generated_by: "demo",
      },
    ]);

    await supabase.from("required_documents").insert([
      {
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        name: "Kontoauszuege der letzten drei Monate",
        description: "Alle Konten, lueckenlos.",
        is_required: true,
      },
      {
        user_id: user.id,
        case_id: caseRow.id,
        source_document_id: documentId,
        name: "Mietbescheinigung",
        description: "Nachweis der Kosten der Unterkunft.",
        is_required: true,
      },
    ]);

    await supabase.from("forms").insert({
      user_id: user.id,
      case_id: caseRow.id,
      name: "Weiterbewilligungsantrag Buergergeld",
      form_number: "WBA",
      description: "Antrag auf Weiterbewilligung der Leistungen nach dem SGB II.",
      official_url: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
      source_kind: "official_catalog",
      source_label: "Bundesagentur fuer Arbeit",
      authority_key: "jobcenter",
    });

    await recordCaseEvents([
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "case_created",
        title: "Demo-Vorgang angelegt",
        metadata: { demo: true },
      },
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "document_uploaded",
        title: "Dokument hochgeladen",
        description: "Demo-Schreiben-Jobcenter.pdf",
        metadata: { documentId, demo: true },
      },
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "authority_detected",
        title: "Behoerde erkannt: Jobcenter",
        metadata: { confidence: 0.96 },
      },
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "deadline_detected",
        title: "Frist erkannt: 15.10.2026",
        metadata: { count: 1 },
      },
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "tasks_created",
        title: "3 Aufgaben erstellt",
        metadata: { count: 3 },
      },
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath("/tasks");
    revalidatePath("/deadlines");
    revalidatePath("/documents");

    return ok({ caseId: caseRow.id });
  } catch (error) {
    return fail(error);
  }
}
