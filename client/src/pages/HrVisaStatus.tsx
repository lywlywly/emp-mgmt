import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileDownloadUrl, filePreviewUrl } from "@/lib/files";
import { queryClient, trpc } from "@/lib/trpc";

function date(value: string | null) {
  return value ? value.slice(0, 10) : "Not provided yet";
}

function WorkAuthorization({
  workAuthorization,
}: {
  workAuthorization: {
    title: string | null;
    startDate: string | null;
    endDate: string | null;
  };
}) {
  return (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted-foreground">Work authorization</dt>
        <dd className="mt-0.5 font-medium">
          {workAuthorization.title ?? "Not provided yet"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Start date</dt>
        <dd className="mt-0.5 font-medium">
          {date(workAuthorization.startDate)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">End date</dt>
        <dd className="mt-0.5 font-medium">
          {date(workAuthorization.endDate)}
        </dd>
      </div>
    </dl>
  );
}

export default function HrVisaStatus() {
  const [view, setView] = useState<"in-progress" | "all">("in-progress");
  const [search, setSearch] = useState("");
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const workflows = useQuery(trpc.hr.visaInProgress.queryOptions());
  const allWorkflows = useQuery(
    trpc.hr.visaAll.queryOptions(
      { query: search || undefined },
      { enabled: view === "all" },
    ),
  );
  const review = useMutation(
    trpc.opt.review.mutationOptions({
      onSuccess: () => {
        setRejectionTarget(null);
        setFeedback("");
        void queryClient.invalidateQueries({
          queryKey: trpc.hr.visaInProgress.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.hr.visaAll.queryKey(),
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

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Visa status</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Review OPT progress and employee documents.
        </p>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          onClick={() => setView("in-progress")}
          type="button"
          variant={view === "in-progress" ? "default" : "ghost"}
        >
          In progress
        </Button>
        <Button
          onClick={() => setView("all")}
          type="button"
          variant={view === "all" ? "default" : "ghost"}
        >
          All
        </Button>
      </div>

      {view === "in-progress" ? (
        <div className="space-y-3">
          {workflows.isPending ? (
            <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
          ) : workflows.isError ? (
            <p className="text-sm text-destructive">
              {workflows.error.message}
            </p>
          ) : workflows.data?.length ? (
            workflows.data.map((workflow) => {
              const rowId = workflow.userId ?? workflow.invitationId!;
              const optStep =
                workflow.step === "application" ? null : workflow.step;
              const reviewable =
                workflow.waitingOn === "hr" &&
                Boolean(optStep) &&
                Boolean(workflow.userId);
              const showRejection = rejectionTarget === rowId;
              return (
                <article className="rounded-lg border bg-card p-5" key={rowId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{workflow.fullName}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {workflow.email}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {workflow.daysRemaining === null
                        ? "Days remaining: not provided yet"
                        : `${workflow.daysRemaining} days remaining`}
                    </span>
                  </div>
                  <WorkAuthorization
                    workAuthorization={workflow.workAuthorization}
                  />
                  <p className="mt-4 text-sm">
                    <span className="font-medium">Next step: </span>
                    {workflow.nextStep}
                  </p>
                  {reviewable ? (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {workflow.pendingFile && (
                        <div className="flex gap-3 text-sm">
                          <a
                            className="text-primary hover:underline"
                            href={filePreviewUrl(workflow.pendingFile)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Preview document
                          </a>
                          <a
                            className="text-primary hover:underline"
                            href={fileDownloadUrl(workflow.pendingFile)}
                          >
                            Download document
                          </a>
                        </div>
                      )}
                      {showRejection && (
                        <label className="block text-sm font-medium">
                          Rejection feedback
                          <textarea
                            className="mt-1 min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                            onChange={(event) =>
                              setFeedback(event.target.value)
                            }
                            placeholder="Explain what needs to be corrected."
                            value={feedback}
                          />
                        </label>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              userId: workflow.userId!,
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
                                  userId: workflow.userId!,
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
                              setRejectionTarget(rowId);
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
                      className="mt-4 inline-block text-sm text-primary hover:underline"
                      to="/hr/hiring"
                    >
                      Review onboarding application
                    </Link>
                  ) : workflow.canNotify ? (
                    <div className="mt-4 border-t pt-4">
                      <Button
                        disabled={notify.isPending}
                        onClick={() =>
                          notify.mutate(
                            workflow.userId
                              ? { target: "employee", userId: workflow.userId }
                              : {
                                  target: "invitation",
                                  invitationId: workflow.invitationId!,
                                },
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        Send Notification
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              No visa-status records are in progress.
            </p>
          )}
          {notify.isError && (
            <p className="text-sm text-destructive">{notify.error.message}</p>
          )}
          {review.isError && (
            <p className="text-sm text-destructive">{review.error.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by first, last, or preferred name"
            value={search}
          />
          {allWorkflows.isPending ? (
            <div className="h-80 animate-pulse rounded-lg border bg-muted/40" />
          ) : allWorkflows.isError ? (
            <p className="text-sm text-destructive">
              {allWorkflows.error.message}
            </p>
          ) : allWorkflows.data?.length ? (
            <div className="space-y-3">
              {allWorkflows.data.map((workflow) => (
                <article
                  className="rounded-lg border bg-card p-5"
                  key={workflow.userId}
                >
                  <h2 className="font-semibold">{workflow.fullName}</h2>
                  <WorkAuthorization
                    workAuthorization={workflow.workAuthorization}
                  />
                  <p className="mt-4 text-sm">
                    <span className="font-medium">Days remaining: </span>
                    {workflow.daysRemaining === null
                      ? "Not provided yet"
                      : workflow.daysRemaining}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Next step: </span>
                    {workflow.nextStep}
                  </p>
                  <div className="mt-4 border-t pt-4">
                    <h3 className="text-sm font-medium">Approved documents</h3>
                    {workflow.approvedDocuments.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {workflow.approvedDocuments.map((document) => (
                          <li
                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                            key={document.step}
                          >
                            <span>{document.label}</span>
                            <span className="flex gap-3">
                              <a
                                className="text-primary hover:underline"
                                href={filePreviewUrl(document.file)}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Preview
                              </a>
                              <a
                                className="text-primary hover:underline"
                                href={fileDownloadUrl(document.file)}
                              >
                                Download
                              </a>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No approved documents yet.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No employees match your search.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
