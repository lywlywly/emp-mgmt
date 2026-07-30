import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  OptDocument,
  OptDocumentKind,
  OptDocumentSubmission,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { useState } from "react";

const documentLabels: Record<OptDocumentKind, string> = {
  opt_receipt: "OPT Receipt",
  opt_ead: "OPT EAD",
  i_983: "I-983",
  i_20: "I-20",
};

const statusLabels = {
  not_started: "Not started",
  pending: "Waiting for HR",
  approved: "Approved",
  rejected: "Changes required",
} as const;

const statusClasses = {
  not_started: "bg-muted text-muted-foreground",
  pending: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
} as const;

type OptDocumentCardProps = {
  document: OptDocument;
  isActionable: boolean;
  isSubmitting: boolean;
  message?: string;
  onSubmit: (submission: OptDocumentSubmission) => void;
};

export function OptDocumentCard({
  document,
  isActionable,
  isSubmitting,
  message,
  onSubmit,
}: OptDocumentCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isRejected = document.status === "rejected";

  return (
    <article className="rounded-lg border bg-card p-5 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{documentLabels[document.kind]}</h2>
          {document.file && (
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted: {document.file.fileName}
            </p>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            statusClasses[document.status],
          )}
        >
          {statusLabels[document.status]}
        </span>
      </div>

      {document.feedback && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          HR feedback: {document.feedback}
        </p>
      )}

      {isActionable ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          {document.kind === "i_983" && (
            <div className="flex flex-wrap gap-2">
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                download
                href="/opt-templates/i-983-empty-template.pdf"
              >
                Empty template
              </a>
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                download
                href="/opt-templates/i-983-sample-template.pdf"
              >
                Sample template
              </a>
            </div>
          )}
          <Input
            accept="image/*,application/pdf"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
            type="file"
          />
          <Button
            disabled={!selectedFile || isSubmitting}
            onClick={() => {
              if (!selectedFile) return;

              onSubmit({
                kind: document.kind,
                fileName: selectedFile.name,
                mimeType: selectedFile.type,
                size: selectedFile.size,
              });
            }}
            type="button"
          >
            {isSubmitting
              ? "Submitting..."
              : isRejected
                ? "Submit replacement"
                : `Submit ${documentLabels[document.kind]}`}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {message ??
            (document.status === "approved"
              ? "Approved by HR."
              : "Complete the previous step and wait for HR approval.")}
        </p>
      )}
    </article>
  );
}
