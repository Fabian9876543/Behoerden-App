import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth";
import { listDocuments } from "@/lib/db/documents";
import { listCasesWithContext } from "@/lib/db/cases";
import { DocumentList } from "@/components/documents/document-list";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { resolveMaxUploadBytes } from "@/lib/env";
import { LegalNotice } from "@/components/shared/legal-notice";

export const metadata: Metadata = { title: "Dokumente" };
export const dynamic = "force-dynamic";

/**
 * Die Analyse ruft Claude synchron im Request auf. Das Standard-Timeout einer
 * Serverless Function reicht dafür bei mehrseitigen Bescheiden nicht; 60
 * Sekunden sind auf dem Hobby-Plan die Obergrenze. Läuft die Anwendung
 * woanders, ist dieser Export wirkungslos.
 */
export const maxDuration = 60;


export default async function DocumentsPage() {
  const user = await requireUserOrRedirect();
  const [documents, cases] = await Promise.all([
    listDocuments(user.id),
    listCasesWithContext(user.id, { onlyActive: true }),
  ]);

  const caseTitles = new Map<string, string>();
  for (const document of documents) {
    if (document.cases) caseTitles.set(document.cases.id, document.cases.title);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dokumente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle hochgeladenen Schreiben. Nur du hast Zugriff darauf.
        </p>
      </div>

      <UploadDropzone
        openCases={cases.map((entry) => ({ id: entry.id, title: entry.title }))}
        maxBytes={resolveMaxUploadBytes()}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          {documents.length === 1 ? "1 Dokument" : `${documents.length} Dokumente`}
        </h2>
        <DocumentList documents={documents} showCase caseTitles={caseTitles} />
      </section>

      <LegalNotice />
    </div>
  );
}
