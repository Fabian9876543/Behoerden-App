/**
 * Handgepflegte Typen fuer das Supabase-Schema.
 *
 * Bewusst nicht generiert, damit das Repository ohne laufende Datenbank
 * typcheckbar bleibt. Bei Schemaaenderungen hier nachziehen
 * (oder `supabase gen types typescript` verwenden).
 */

export type CaseStatus =
  | "action_required"
  | "waiting_on_user"
  | "waiting_on_authority"
  | "in_progress"
  | "completed";

export type CasePriority = "low" | "normal" | "high" | "critical";
export type TaskStatus = "open" | "in_progress" | "completed" | "dismissed";
export type DeadlineStatus = "upcoming" | "due_soon" | "overdue" | "met" | "dismissed";
export type DocumentStatus = "uploaded" | "extracting" | "analyzing" | "analyzed" | "failed";
export type DocumentSource = "upload" | "scan" | "demo";
export type LetterStatus = "draft" | "approved" | "sent" | "discarded";
export type HouseholdMode = "personal" | "family";
export type FormSourceKind = "official_catalog" | "authority_website" | "unverified";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  household_mode: HouseholdMode;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseRow {
  id: string;
  user_id: string;
  title: string;
  authority_name: string | null;
  authority_key: string | null;
  case_type: string | null;
  reference_number: string | null;
  status: CaseStatus;
  priority: CasePriority;
  summary: string | null;
  is_demo: boolean;
  closed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  status: DocumentStatus;
  source: DocumentSource;
  page_count: number | null;
  extracted_text: string | null;
  extraction_method: string | null;
  document_date: string | null;
  error_message: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentAnalysisRow {
  id: string;
  user_id: string;
  document_id: string;
  case_id: string | null;
  model: string;
  schema_version: number;
  result: unknown;
  document_type: string | null;
  authority_name: string | null;
  authority_confidence: number | null;
  summary: string | null;
  uncertainty_notes: string[];
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export interface DeadlineRow {
  id: string;
  user_id: string;
  case_id: string;
  source_document_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  status: DeadlineStatus;
  source_text: string | null;
  source_page: number | null;
  confidence: number | null;
  extracted_at: string | null;
  reminder_days_before: number[];
  reminder_channels: string[];
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  case_id: string;
  source_document_id: string | null;
  deadline_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  is_required: boolean;
  due_date: string | null;
  position: number;
  source_text: string | null;
  source_page: number | null;
  confidence: number | null;
  generated_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocumentRow {
  id: string;
  user_id: string;
  case_id: string;
  source_document_id: string | null;
  name: string;
  description: string | null;
  is_required: boolean;
  fulfilled_by_document_id: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormRow {
  id: string;
  user_id: string;
  case_id: string;
  name: string;
  form_number: string | null;
  description: string | null;
  official_url: string | null;
  source_kind: FormSourceKind;
  source_label: string | null;
  authority_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedLetterRow {
  id: string;
  user_id: string;
  case_id: string;
  subject: string;
  body: string;
  intent: string | null;
  model: string | null;
  status: LetterStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseEventRow {
  id: string;
  user_id: string;
  case_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Wandelt einen Interface-Typ in einen anonymen Objekttyp um.
 *
 * Hintergrund: supabase-js verlangt, dass jede Tabelle `GenericSchema`
 * erfuellt - also `Record<string, unknown>`. Type-Aliase und Mapped Types
 * bekommen dafuer eine implizite Index-Signatur, Interfaces nicht. Ohne
 * diese Umwandlung faellt der Client stillschweigend auf `never` zurueck
 * und jede Query verliert ihre Typen.
 */
type AsRecord<T> = { [K in keyof T]: T[K] };

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: AsRecord<Row>;
  Insert: AsRecord<Insert>;
  Update: AsRecord<Update>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      cases: Table<CaseRow>;
      documents: Table<DocumentRow>;
      document_analysis: Table<DocumentAnalysisRow>;
      deadlines: Table<DeadlineRow>;
      tasks: Table<TaskRow>;
      required_documents: Table<RequiredDocumentRow>;
      forms: Table<FormRow>;
      generated_letters: Table<GeneratedLetterRow>;
      case_events: Table<CaseEventRow>;
    };
    Views: Record<string, never>;
    Functions: {
      delete_my_data: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      case_status: CaseStatus;
      case_priority: CasePriority;
      task_status: TaskStatus;
      deadline_status: DeadlineStatus;
      document_status: DocumentStatus;
      document_source: DocumentSource;
      letter_status: LetterStatus;
      household_mode: HouseholdMode;
    };
    CompositeTypes: Record<string, never>;
  };
}
