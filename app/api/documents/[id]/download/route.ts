import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireDocument } from "@/lib/db/documents";
import { createSignedUrl } from "@/lib/storage/documents";
import { AppError, toUserMessage } from "@/lib/errors";

/**
 * Leitet auf eine kurzlebige signierte URL um.
 *
 * Der Bucket ist privat; ohne Session und Eigentuemerschaft gibt es keinen
 * Zugriff. Die URL ist 5 Minuten gueltig.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const document = await requireDocument(id, user.id);

    if (document.is_demo) {
      throw new AppError(
        "not_found",
        "Zum Demo-Dokument gibt es keine Datei zum Herunterladen.",
      );
    }

    const url = await createSignedUrl(document.storage_path, 300);
    return NextResponse.redirect(url);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
