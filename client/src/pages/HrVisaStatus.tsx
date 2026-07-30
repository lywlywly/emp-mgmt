import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, trpc } from "@/lib/trpc";

const documentLabels = {
  opt_receipt: "OPT Receipt",
  opt_ead: "OPT EAD",
  i_983: "I-983",
  i_20: "I-20",
} as const;

const statusClasses = {
  not_started: "bg-muted text-muted-foreground",
  pending: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
} as const;

export default function HrVisaStatus() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [feedback, setFeedback] = useState("");
  const [reminderSent, setReminderSent] = useState(false);
  const employeesQuery = useQuery(trpc.hr.opt.list.queryOptions());
  const employeeId = selectedEmployeeId ?? employeesQuery.data?.[0]?.employeeId;
  const employeeQuery = useQuery(
    trpc.hr.opt.getByEmployeeId.queryOptions(
      { employeeId: employeeId ?? "" },
      { enabled: Boolean(employeeId) },
    ),
  );

  function refreshEmployee() {
    void queryClient.invalidateQueries({
      queryKey: trpc.hr.opt.list.queryKey(),
    });
    if (employeeId) {
      void queryClient.invalidateQueries({
        queryKey: trpc.hr.opt.getByEmployeeId.queryKey({ employeeId }),
      });
    }
  }

  const review = useMutation(
    trpc.hr.opt.reviewDocument.mutationOptions({
      onSuccess: () => {
        refreshEmployee();
        setFeedback("");
      },
    }),
  );
  const sendReminder = useMutation(
    trpc.hr.opt.sendNextStepReminder.mutationOptions({
      onSuccess: () => setReminderSent(true),
    }),
  );

  if (employeesQuery.isPending) {
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />;
  }

  if (employeesQuery.isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {employeesQuery.error.message}
      </p>
    );
  }

  const employee = employeeQuery.data;
  const pendingDocument = employee?.workflow.documents.find(
    (document) => document.status === "pending",
  );

  return (
    <section className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="text-4xl font-bold tracking-tight">Visa status</h1>
        <p className="text-lg text-muted-foreground">
          Review pending OPT documents and remind employees when their next
          upload is available.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          {employeesQuery.data.map((item) => (
            <button
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                item.employeeId === employeeId
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
              key={item.employeeId}
              onClick={() => {
                setSelectedEmployeeId(item.employeeId);
                setFeedback("");
                setReminderSent(false);
              }}
              type="button"
            >
              <p className="font-medium">{item.employeeName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.workflow.nextAction.message}
              </p>
            </button>
          ))}
        </div>

        {employee ? (
          <div className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">
                  {employee.employeeName}
                </p>
                <h2 className="mt-1 text-xl font-semibold">OPT workflow</h2>
              </div>
              <p className="max-w-xs text-right text-sm text-muted-foreground">
                {employee.workflow.nextAction.message}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {employee.workflow.documents.map((document) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-md border p-3"
                  key={document.kind}
                >
                  <div>
                    <p className="font-medium">
                      {documentLabels[document.kind]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {document.file?.fileName ?? "Not uploaded"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[document.status]}`}
                  >
                    {document.status}
                  </span>
                </div>
              ))}
            </div>

            {pendingDocument && (
              <div className="mt-6 space-y-3 border-t pt-5">
                <p className="text-sm font-medium">
                  Review {documentLabels[pendingDocument.kind]}
                </p>
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
                        employeeId: employee.employeeId,
                        kind: pendingDocument.kind,
                        decision: "approve",
                      })
                    }
                    type="button"
                  >
                    Approve document
                  </Button>
                  <Button
                    disabled={review.isPending || !feedback.trim()}
                    onClick={() =>
                      review.mutate({
                        employeeId: employee.employeeId,
                        kind: pendingDocument.kind,
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

            {employee.workflow.nextAction.type === "upload" && (
              <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
                <p className="text-sm text-muted-foreground">
                  The employee can complete the next upload.
                </p>
                <Button
                  disabled={sendReminder.isPending}
                  onClick={() =>
                    sendReminder.mutate({ employeeId: employee.employeeId })
                  }
                  type="button"
                  variant="outline"
                >
                  {sendReminder.isPending ? "Sending..." : "Send reminder"}
                </Button>
              </div>
            )}
            {reminderSent && (
              <p className="mt-3 text-sm text-primary">
                Reminder recorded by the mock service.
              </p>
            )}
            {(review.isError || sendReminder.isError) && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {review.error?.message ?? sendReminder.error?.message}
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
