import { useMutation, useQuery } from "@tanstack/react-query";

import { OptDocumentCard } from "@/features/opt/OptDocumentCard";
import type { OptDocumentSubmission } from "@/lib/onboarding";
import { queryClient, trpc } from "@/lib/trpc";

export default function EmployeeVisaStatus() {
  const workflowQuery = useQuery(trpc.opt.getMine.queryOptions());
  const submitDocument = useMutation(
    trpc.opt.submitDocument.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.opt.getMine.queryKey(),
        }),
    }),
  );

  function submitOptDocument(input: OptDocumentSubmission) {
    submitDocument.mutate(input);
  }

  if (workflowQuery.isPending) {
    return (
      <section className="max-w-2xl animate-pulse space-y-6">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-10 w-56 rounded bg-muted" />
        <div className="h-52 rounded-lg border bg-card" />
      </section>
    );
  }

  if (workflowQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {workflowQuery.error.message}
      </p>
    );
  }

  const workflow = workflowQuery.data;
  if (!workflow.applies) {
    return (
      <section className="max-w-2xl space-y-6">
        <p className="text-sm font-medium text-primary">Employee portal</p>
        <div className="rounded-lg border bg-card p-6 text-card-foreground">
          OPT status management does not apply to your current work
          authorization.
        </div>
      </section>
    );
  }

  const approvedCount = workflow.documents.filter(
    (document) => document.status === "approved",
  ).length;

  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">Employee portal</p>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Visa status</h1>
        <p className="text-lg text-muted-foreground">
          Follow each OPT document step and complete the next action after HR
          approval.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">OPT document progress</h2>
          <span className="text-sm text-muted-foreground">
            {approvedCount} of {workflow.documents.length} approved
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {workflow.nextAction.message}
        </p>
      </div>
      {submitDocument.isError && (
        <p className="text-sm text-destructive" role="alert">
          {submitDocument.error.message}
        </p>
      )}
      <div className="space-y-4">
        {workflow.documents.map((document) => {
          const isActionable =
            workflow.nextAction.type === "upload" &&
            workflow.nextAction.document === document.kind;
          const isCurrent = workflow.nextAction.document === document.kind;

          return (
            <OptDocumentCard
              document={document}
              isActionable={isActionable}
              isSubmitting={submitDocument.isPending && isActionable}
              key={document.kind}
              message={isCurrent ? workflow.nextAction.message : undefined}
              onSubmit={submitOptDocument}
            />
          );
        })}
      </div>
    </section>
  );
}
