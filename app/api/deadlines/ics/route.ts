import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listDeadlines } from "@/lib/db/deadlines";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { AppError, toUserMessage } from "@/lib/errors";

/** Exportiert alle offenen Fristen als .ics-Datei. */
export async function GET() {
  try {
    const user = await requireUser();
    const deadlines = await listDeadlines(user.id);

    const calendar = buildIcsCalendar(
      deadlines.map((deadline) => ({
        uid: deadline.id,
        date: deadline.due_date,
        title: deadline.cases?.title
          ? `${deadline.cases.title}: ${deadline.title}`
          : deadline.title,
        description: deadline.description,
        reminderDaysBefore: deadline.reminder_days_before,
      })),
    );

    return new NextResponse(calendar, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="behoerdenbuddy-fristen.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: toUserMessage(error) }, { status });
  }
}
