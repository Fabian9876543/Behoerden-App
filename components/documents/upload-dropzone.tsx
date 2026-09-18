"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload } from "lucide-react";
import { analyzeDocumentAction, uploadDocumentAction } from "@/app/actions/documents";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UploadProgress, type AnalysisStep } from "@/components/documents/upload-progress";
import { DEFAULT_MAX_UPLOAD_BYTES, SUPPORTED_MIME_TYPES } from "@/lib/documents/mime";
import { cn } from "@/lib/utils";

const INITIAL_STEPS: AnalysisStep[] = [
  { key: "upload", label: "Dokument hochladen", state: "pending" },
  { key: "extract", label: "Dokument wird gelesen", state: "pending" },
  { key: "analyze", label: "Dokument wird analysiert", state: "pending" },
  { key: "deadlines", label: "Fristen werden geprüft", state: "pending" },
  { key: "tasks", label: "Aufgaben werden erkannt", state: "pending" },
];

/**
 * Zentraler Upload-Flow.
 *
 * Nach dem Upload startet die Analyse sofort. Der Nutzer wird anschliessend
 * auf den Vorgang geleitet - dort steht direkt, was zu tun ist.
 */
export interface UploadTarget {
  id: string;
  title: string;
}

export function UploadDropzone({
  caseId,
  compact = false,
  openCases = [],
}: {
  /** Fest vorgegebener Vorgang - dann entfällt die Auswahl. */
  caseId?: string;
  compact?: boolean;
  /** Offene Vorgänge, denen das Dokument zugeordnet werden kann. */
  openCases?: UploadTarget[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetCaseId, setTargetCaseId] = useState("");
  const [steps, setSteps] = useState<AnalysisStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = useCallback((key: string, update: Partial<AnalysisStep>) => {
    setSteps((current) =>
      (current ?? INITIAL_STEPS).map((step) =>
        step.key === key ? { ...step, ...update } : step,
      ),
    );
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > DEFAULT_MAX_UPLOAD_BYTES) {
        setError("Die Datei ist zu groß. Erlaubt sind maximal 10 MB.");
        return;
      }
      if (!(SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type)) {
        setError("Dieses Dateiformat wird nicht unterstützt. Möglich sind PDF, JPG und PNG.");
        return;
      }

      setBusy(true);
      setSteps(INITIAL_STEPS.map((step) => ({ ...step })));
      patch("upload", { state: "running" });

      const formData = new FormData();
      formData.append("file", file);
      const target = caseId ?? targetCaseId;
      if (target) formData.append("caseId", target);

      const uploaded = await uploadDocumentAction(formData);
      if (!uploaded.ok || !uploaded.data) {
        patch("upload", { state: "failed", result: uploaded.error?.message });
        setError(uploaded.error?.message ?? "Der Upload ist fehlgeschlagen.");
        setBusy(false);
        return;
      }

      patch("upload", { state: "done", result: "Datei gespeichert" });
      patch("extract", { state: "running" });
      patch("analyze", { state: "running" });

      const analyzed = await analyzeDocumentAction(uploaded.data.documentId);

      if (!analyzed.ok || !analyzed.data) {
        const message = analyzed.error?.message ?? "Die Analyse ist fehlgeschlagen.";
        patch("extract", { state: "failed" });
        patch("analyze", { state: "failed", result: message });
        setError(message);
        setBusy(false);
        // Das Dokument ist gespeichert - der Vorgang bleibt erreichbar.
        router.refresh();
        return;
      }

      const result = analyzed.data;
      patch("extract", { state: "done", result: "Text extrahiert" });
      patch("analyze", {
        state: "done",
        result: result.authorityName
          ? `Behörde erkannt: ${result.authorityName}`
          : "Behörde nicht eindeutig erkannt",
      });
      patch("deadlines", {
        state: "done",
        result:
          result.deadlineCount === 0
            ? "Keine Frist gefunden"
            : `${result.deadlineCount} Frist(en) gefunden`,
      });
      patch("tasks", {
        state: "done",
        result:
          result.taskCount === 0
            ? "Keine Aufgaben erkannt"
            : `${result.taskCount} Aufgabe(n) gefunden`,
      });

      setBusy(false);
      router.push(`/cases/${result.caseId}?analyzed=1`);
      router.refresh();
    },
    [caseId, targetCaseId, patch, router],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file && !busy) void handleFile(file);
    },
    [busy, handleFile],
  );

  if (steps) {
    return (
      <Card>
        <CardContent className="space-y-5 pt-5">
          <UploadProgress steps={steps} />
          {error ? (
            <>
              <Alert variant="critical">{error}</Alert>
              <Button
                variant="outline"
                onClick={() => {
                  setSteps(null);
                  setError(null);
                }}
              >
                Erneut versuchen
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const canChooseCase = !caseId && openCases.length > 0;

  return (
    <div className="space-y-3">
      {canChooseCase ? (
        <div className="space-y-1.5 rounded-xl border bg-card px-4 py-3">
          <Label htmlFor="upload-target">Gehört zu</Label>
          <Select
            id="upload-target"
            value={targetCaseId}
            onChange={(event) => setTargetCaseId(event.target.value)}
          >
            <option value="">Neuer Vorgang</option>
            {openCases.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Post zu einem Vorhaben, das du schon angelegt hast? Dann landet das Schreiben dort -
            samt Fristen und Aufgaben daraus.
          </p>
        </div>
      ) : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-xl border-2 border-dashed bg-card px-6 text-center transition-colors",
          compact ? "py-6" : "py-10",
          isDragging ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <FileUp
          className={cn("mx-auto text-muted-foreground", compact ? "size-6" : "size-8")}
          aria-hidden
        />
        <p className={cn("mt-3 font-medium", compact ? "text-sm" : "text-base")}>
          Behördenbrief hinzufügen
        </p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, Foto oder Scan hochladen</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Oder das Dokument einfach hier hineinziehen
        </p>

        <Button
          className="mt-5"
          size={compact ? "default" : "lg"}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="size-4" aria-hidden />
          Datei auswählen
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_MIME_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error ? (
        <Alert variant="critical" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
