import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { HiringApplicationDetails } from "@/features/hr/HiringApplicationDetails";
import { queryClient, trpc } from "@/lib/trpc";

export default function HrHiringManagement() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const applications = useQuery(
    trpc.onboarding.listByStatus.queryOptions({ status: "pending" }),
  );
  const application = useQuery(
    trpc.onboarding.getById.queryOptions(
      { id: selectedId ?? "" },
      { enabled: Boolean(selectedId) },
    ),
  );
  const review = useMutation(
    trpc.onboarding.review.mutationOptions({
      onSuccess: () => {
        setSelectedId(null);
        setFeedback("");
        void queryClient.invalidateQueries({
          queryKey: trpc.onboarding.listByStatus.queryKey(),
        });
      },
    }),
  );

  function selectApplication(id: string) {
    setSelectedId((currentId) => (currentId === id ? null : id));
    setFeedback("");
  }

  if (applications.isPending) {
    return <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (applications.isError) {
    return (
      <p className="text-sm text-destructive">{applications.error.message}</p>
    );
  }

  return (
    <section className="max-w-4xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Hiring management
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Review submitted onboarding applications.
        </p>
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-card">
          {applications.data.length ? (
            applications.data.map((item) => (
              <button
                aria-pressed={selectedId === item.id}
                className={`flex w-full items-center justify-between gap-4 border-b p-4 text-left transition-colors last:border-0 hover:bg-muted/40 ${
                  selectedId === item.id ? "bg-muted/50" : ""
                }`}
                key={item.id}
                onClick={() => selectApplication(item.id)}
                type="button"
              >
                <span>
                  <span className="block font-medium">{item.fullName}</span>
                  <span className="block text-sm text-muted-foreground">
                    {item.email}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {selectedId === item.id ? "Reviewing" : "Review"}
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No pending applications.
            </p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 sm:p-6">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">
              Select an application to review its details.
            </p>
          ) : application.isPending ? (
            <div className="h-56 animate-pulse rounded bg-muted/40" />
          ) : application.isError ? (
            <p className="text-sm text-destructive">
              {application.error.message}
            </p>
          ) : application.data ? (
            <div className="space-y-5">
              <HiringApplicationDetails application={application.data} />
              <label className="block text-sm font-medium">
                Feedback for a rejection
                <textarea
                  className="mt-1 min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Explain what the employee needs to change."
                  value={feedback}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({
                      id: application.data.id,
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
                      id: application.data.id,
                      decision: "reject",
                      feedback,
                    })
                  }
                  type="button"
                  variant="destructive"
                >
                  Reject application
                </Button>
              </div>
              {review.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {review.error.message}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
