import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/lib/trpc";

const statusClasses = {
  pending: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  not_started: "bg-muted text-muted-foreground",
} as const;

export default function HrHiringManagement() {
  const [selectedId, setSelectedId] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const applicationsQuery = useQuery(trpc.hr.onboarding.list.queryOptions());
  const applicationId = selectedId ?? applicationsQuery.data?.[0]?.id;
  const applicationQuery = useQuery(
    trpc.hr.onboarding.getById.queryOptions(
      { id: applicationId ?? "" },
      { enabled: Boolean(applicationId) },
    ),
  );
  const review = useMutation(
    trpc.hr.onboarding.review.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.hr.onboarding.list.queryKey(),
        });
        if (applicationId) {
          void queryClient.invalidateQueries({
            queryKey: trpc.hr.onboarding.getById.queryKey({
              id: applicationId,
            }),
          });
        }
        setFeedback("");
      },
    }),
  );

  if (applicationsQuery.isPending) {
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />;
  }

  if (applicationsQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {applicationsQuery.error.message}
      </p>
    );
  }

  return (
    <section className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="text-4xl font-bold tracking-tight">Hiring management</h1>
        <p className="text-lg text-muted-foreground">
          Review submitted onboarding applications and send employees feedback
          when changes are needed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          {applicationsQuery.data.map((application) => (
            <button
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                application.id === applicationId
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              key={application.id}
              onClick={() => {
                setSelectedId(application.id);
                setFeedback("");
              }}
              type="button"
            >
              <p className="font-medium">{application.employeeName}</p>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[application.status]}`}
              >
                {application.status}
              </span>
            </button>
          ))}
        </div>

        {applicationQuery.data ? (
          <div className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">
                  {applicationQuery.data.employeeName}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Onboarding application
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[applicationQuery.data.status]}`}
              >
                {applicationQuery.data.status}
              </span>
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="mt-1">
                  {applicationQuery.data.data.contact.email}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Work authorization</dt>
                <dd className="mt-1">
                  {applicationQuery.data.data.workAuthorization.type?.toUpperCase() ??
                    applicationQuery.data.data.workAuthorization
                      .residentOrCitizenType ??
                    "Not provided"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Submitted documents</dt>
                <dd className="mt-1">
                  {applicationQuery.data.data.documents
                    .map((document) => document.fileName)
                    .join(", ") || "None"}
                </dd>
              </div>
            </dl>

            {applicationQuery.data.status === "pending" && (
              <div className="mt-6 space-y-3 border-t pt-5">
                <Input
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Feedback required only when rejecting"
                  value={feedback}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({
                        id: applicationQuery.data.id,
                        decision: "approve",
                      })
                    }
                    type="button"
                  >
                    Approve application
                  </Button>
                  <Button
                    disabled={review.isPending || !feedback.trim()}
                    onClick={() =>
                      review.mutate({
                        id: applicationQuery.data.id,
                        decision: "reject",
                        feedback,
                      })
                    }
                    type="button"
                    variant="destructive"
                  >
                    Reject with feedback
                  </Button>
                </div>
              </div>
            )}
            {applicationQuery.data.hrFeedback && (
              <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Previous feedback: {applicationQuery.data.hrFeedback}
              </p>
            )}
            {review.isError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {review.error.message}
              </p>
            )}
          </div>
        ) : (
          <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
        )}
      </div>
    </section>
  );
}
