import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { fileDownloadUrl } from "@/lib/files";
import { queryClient, trpc } from "@/lib/trpc";

export default function HrVisaStatus() {
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const workflows = useQuery(trpc.hr.visaInProgress.queryOptions());
  const review = useMutation(
    trpc.opt.review.mutationOptions({
      onSuccess: () => {
        setRejectionTarget(null);
        setFeedback("");
        void queryClient.invalidateQueries({
          queryKey: trpc.hr.visaInProgress.queryKey(),
        });
      },
    }),
  );
  const notify = useMutation(
    trpc.hr.sendNotification.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.hr.visaInProgress.queryKey(),
        }),
    }),
  );

  if (workflows.isPending) {
    return <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />;
  }
  if (workflows.isError) {
    return (
      <p className="text-sm text-destructive">{workflows.error.message}</p>
    );
  }

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Visa status</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Review the current OPT document or remind the employee when action is
          needed.
        </p>
      </div>
      <div className="space-y-3">
        {workflows.data.map((workflow) => {
          const optStep =
            workflow.step === "application" ? null : workflow.step;
          const reviewable = workflow.waitingOn === "hr" && Boolean(optStep);
          const showRejection = rejectionTarget === workflow.userId;
          return (
            <article
              className="rounded-lg border bg-card p-5"
              key={workflow.userId}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{workflow.fullName}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {workflow.nextStep}
                  </p>
                </div>
                {workflow.daysRemaining !== null && (
                  <span className="text-sm text-muted-foreground">
                    {workflow.daysRemaining} days remaining
                  </span>
                )}
              </div>
              {reviewable ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {workflow.pendingFile && (
                    <a
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      href={fileDownloadUrl(workflow.pendingFile)}
                    >
                      Download submitted document
                    </a>
                  )}
                  {showRejection ? (
                    <label className="block text-sm font-medium">
                      Rejection feedback
                      <textarea
                        className="mt-1 min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                        onChange={(event) => setFeedback(event.target.value)}
                        placeholder="Explain what needs to be corrected."
                        value={feedback}
                      />
                    </label>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({
                          userId: workflow.userId,
                          step: optStep!,
                          decision: "approve",
                        })
                      }
                      type="button"
                    >
                      Approve {optStep}
                    </Button>
                    {showRejection ? (
                      <>
                        <Button
                          disabled={review.isPending || !feedback.trim()}
                          onClick={() =>
                            review.mutate({
                              userId: workflow.userId,
                              step: optStep!,
                              decision: "reject",
                              feedback,
                            })
                          }
                          type="button"
                          variant="destructive"
                        >
                          Reject {optStep}
                        </Button>
                        <Button
                          onClick={() => {
                            setRejectionTarget(null);
                            setFeedback("");
                          }}
                          type="button"
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          setRejectionTarget(workflow.userId);
                          setFeedback("");
                        }}
                        type="button"
                        variant="outline"
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              ) : workflow.step === "application" ? (
                <Link
                  className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  to="/hr/hiring"
                >
                  Review onboarding application
                </Link>
              ) : workflow.canNotify ? (
                <div className="mt-4">
                  <Button
                    disabled={notify.isPending}
                    onClick={() => notify.mutate({ userId: workflow.userId })}
                    type="button"
                    variant="outline"
                  >
                    Send reminder
                  </Button>
                  {notify.isError && (
                    <p className="mt-2 text-sm text-destructive">
                      {notify.error.message}
                    </p>
                  )}
                </div>
              ) : null}
              {review.isError &&
                review.variables?.userId === workflow.userId && (
                  <p className="mt-3 text-sm text-destructive">
                    {review.error.message}
                  </p>
                )}
            </article>
          );
        })}
        {!workflows.data.length && (
          <p className="text-sm text-muted-foreground">
            No OPT workflows are in progress.
          </p>
        )}
      </div>
    </section>
  );
}
