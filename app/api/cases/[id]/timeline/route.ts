import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireCase } from "@/lib/db/cases";
import { getCaseTimeline } from "@/lib/db/events";
import { AppError, toUserMessage } from "@/lib/errors";

/**
 * Diese Route liest Cookies bzw. Nutzerdaten und darf nie statisch
 * vorgerendert werden - sonst braeuchte schon der Build die Supabase-Keys.
 */
export const dynamic = "force-dynamic";


/** Liefert die Timeline eines Vorgangs als JSON. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const caseRow = await requireCase(id, user.id);
    const events = await getCaseTimeline(caseRow.id);

    return NextResponse.json(
      {
        caseId: caseRow.id,
        events: events.map((event) => ({
          id: event.id,
          type: event.event_type,
          title: event.title,
          description: event.description,
          createdAt: event.created_at,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
