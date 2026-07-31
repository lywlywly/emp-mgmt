import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileDownloadUrl, uploadFile } from "@/lib/files";
import { queryClient, trpc } from "@/lib/trpc";
import type { OptUploadStep } from "@emp-mgmt/shared";

const steps = ["optReceipt", "optEad", "i983", "i20"] as const;
const labels = {
  optReceipt: "OPT Receipt",
  optEad: "OPT EAD",
  i983: "I-983",
  i20: "I-20",
};

function isUploadStep(step: (typeof steps)[number]): step is OptUploadStep {
  return step !== "optReceipt";
}

export default function EmployeeVisaStatus() {
  const [selectedFiles, setSelectedFiles] = useState<
    Partial<Record<OptUploadStep, File>>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const workflow = useQuery(trpc.opt.getMine.queryOptions());
  const submitDocument = useMutation(
    trpc.opt.uploadNext.mutationOptions({
      onSuccess: () => {
        setSelectedFiles({});
        void queryClient.invalidateQueries({
          queryKey: trpc.opt.getMine.queryKey(),
        });
      },
    }),
  );

  async function submit(step: OptUploadStep) {
    const file = selectedFiles[step];
    if (!file) return;

    try {
      setUploadError(null);
      const uploadedFile = await uploadFile(file);
      await submitDocument.mutateAsync({ step, fileId: uploadedFile.id });
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not submit the document.",
      );
    }
  }

  if (workflow.isPending) {
    return <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (workflow.isError) {
    return <p className="text-sm text-destructive">{workflow.error.message}</p>;
  }
  if (!workflow.data.applicable) {
    return (
      <section className="max-w-2xl rounded-lg border bg-card p-6">
        OPT status management does not apply to your work authorization.
      </section>
    );
  }

  const { steps: stepData } = workflow.data;
  const isComplete = steps.every(
    (step) => stepData[step].status === "approved",
  );
  let previousStepsApproved = true;

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Employee portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Visa status</h1>
        {isComplete ? (
          <p className="mt-2 flex items-center gap-2 text-lg text-emerald-700">
            <CircleCheck aria-hidden="true" className="size-5" />
            Your OPT documentation is complete and has been approved by HR.
          </p>
        ) : (
          <p className="mt-2 text-lg text-muted-foreground">
            Complete each OPT document after HR approves the preceding step.
          </p>
        )}
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const value = stepData[step];
          const canUpload =
            isUploadStep(step) &&
            previousStepsApproved &&
            (value.status === "not_uploaded" || value.status === "rejected");
          const selectedFile = isUploadStep(step)
            ? selectedFiles[step]
            : undefined;
          previousStepsApproved &&= value.status === "approved";

          return (
            <article className="rounded-lg border bg-card p-5" key={step}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{labels[step]}</h2>
                <span className="text-sm capitalize text-muted-foreground">
                  {value.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {value.message ?? "Complete the previous step first."}
              </p>
              {value.file && (
                <a
                  className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  href={fileDownloadUrl(value.file)}
                >
                  Download submitted file
                </a>
              )}
              {value.templates && (
                <p className="mt-3 flex gap-3 text-sm">
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={value.templates.empty}
                  >
                    Empty template
                  </a>
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={value.templates.sample}
                  >
                    Sample template
                  </a>
                </p>
              )}
              {value.feedback && (
                <p className="mt-3 text-sm text-destructive">
                  HR feedback: {value.feedback}
                </p>
              )}
              {canUpload && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                  <Input
                    accept="image/*,application/pdf"
                    className="max-w-xs"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setSelectedFiles((files) => ({ ...files, [step]: file }));
                    }}
                    type="file"
                  />
                  <Button
                    disabled={!selectedFile || submitDocument.isPending}
                    onClick={() => void submit(step)}
                    type="button"
                  >
                    {submitDocument.isPending
                      ? "Submitting..."
                      : "Submit document"}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {uploadError && (
        <p className="text-sm text-destructive" role="alert">
          {uploadError}
        </p>
      )}
      {submitDocument.isError && (
        <p className="text-sm text-destructive" role="alert">
          {submitDocument.error.message}
        </p>
      )}
    </section>
  );
}
