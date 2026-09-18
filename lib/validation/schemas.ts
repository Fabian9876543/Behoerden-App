import { z } from "zod";

/**
 * Eingabevalidierung.
 *
 * Jede Server Action und jeder Route Handler validiert seine Eingabe hier -
 * niemals direkt aus FormData oder JSON lesen.
 */

const uuid = z.string().uuid("Ungueltige ID.");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gueltiges Datum angeben.");

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Bitte E-Mail-Adresse angeben.").email("Ungueltige E-Mail-Adresse."),
  password: z.string().min(8, "Das Passwort muss mindestens 8 Zeichen lang sein."),
});

export const onboardingSchema = z.object({
  householdMode: z.enum(["personal", "family"], {
    errorMap: () => ({ message: "Bitte eine Option waehlen." }),
  }),
});

export const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  street: z.string().trim().max(160).optional().or(z.literal("")),
  postalCode: z
    .string()
    .trim()
    .max(10)
    .refine((v) => v === "" || /^\d{5}$/.test(v), "Bitte eine fuenfstellige PLZ angeben.")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
});

export const createCaseSchema = z.object({
  title: z.string().trim().min(3, "Bitte einen Titel angeben.").max(120),
  authorityName: z.string().trim().max(160).optional().or(z.literal("")),
  caseType: z.string().trim().max(120).optional().or(z.literal("")),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
});

export const updateCaseSchema = z.object({
  caseId: uuid,
  title: z.string().trim().min(3).max(120).optional(),
  authorityName: z.string().trim().max(160).optional().or(z.literal("")),
  caseType: z.string().trim().max(120).optional().or(z.literal("")),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  status: z
    .enum(["action_required", "waiting_on_user", "waiting_on_authority", "in_progress", "completed"])
    .optional(),
});

export const createTaskSchema = z.object({
  caseId: uuid,
  title: z.string().trim().min(3, "Bitte einen Titel angeben.").max(160),
  description: z.string().trim().max(800).optional().or(z.literal("")),
  dueDate: isoDate.optional().or(z.literal("")),
  isRequired: z.boolean().default(true),
});

export const updateTaskSchema = z.object({
  taskId: uuid,
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(800).optional().or(z.literal("")),
  dueDate: isoDate.optional().or(z.literal("")),
  status: z.enum(["open", "in_progress", "completed", "dismissed"]).optional(),
});

export const setTaskStatusSchema = z.object({
  taskId: uuid,
  status: z.enum(["open", "in_progress", "completed", "dismissed"]),
});

export const createDeadlineSchema = z.object({
  caseId: uuid,
  title: z.string().trim().min(3, "Bitte einen Titel angeben.").max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  dueDate: isoDate,
});

export const updateDeadlineSchema = z.object({
  deadlineId: uuid,
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  dueDate: isoDate.optional(),
  status: z.enum(["upcoming", "due_soon", "overdue", "met", "dismissed"]).optional(),
  reminderDaysBefore: z.array(z.number().int().min(0).max(120)).max(5).optional(),
});

export const generateLetterSchema = z.object({
  caseId: uuid,
  intent: z.string().trim().min(1, "Bitte ein Anliegen waehlen.").max(60),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const updateLetterSchema = z.object({
  letterId: uuid,
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(6000),
});

export const idSchema = z.object({ id: uuid });

export const uploadMetadataSchema = z.object({
  /** Leer/undefined = neuen Vorgang anlegen. */
  caseId: uuid.optional().nullable(),
});

/** Erste Fehlermeldung eines Zod-Fehlers - fuer die Anzeige im Formular. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Die Eingabe ist ungueltig.";
}

/** Normalisiert optionale Textfelder: "" -> null. */
export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
