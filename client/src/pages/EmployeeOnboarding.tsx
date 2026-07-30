import { useQuery } from "@tanstack/react-query";

import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { SubmittedOnboarding } from "@/features/onboarding/SubmittedOnboarding";
import { trpc } from "@/lib/trpc";

export default function EmployeeOnboarding() {
  const applicationQuery = useQuery(trpc.onboarding.getMine.queryOptions());

  if (applicationQuery.isPending)
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />;
  if (applicationQuery.isError)
    return (
      <p className="text-sm text-destructive">
        {applicationQuery.error.message}
      </p>
    );
  const application = applicationQuery.data;
  if (application?.status === "approved") return null;
  if (application?.status === "pending") {
    return (
      <section className="max-w-2xl space-y-6">
        <p className="text-sm font-medium text-primary">Employee portal</p>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Onboarding application
          </h1>
          <p className="text-lg text-muted-foreground">
            Your application is waiting for HR review.
          </p>
        </div>
        <SubmittedOnboarding application={application} />
      </section>
    );
  }

  const isRejected = application?.status === "rejected";

  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">Employee portal</p>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Onboarding application
        </h1>
        <p className="text-lg text-muted-foreground">
          Complete your information and supporting documents for HR review.
        </p>
      </div>
      {isRejected && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Changes required
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {application.hrFeedback}
          </p>
        </div>
      )}
      <OnboardingForm
        application={
          application?.status === "rejected" ? application : undefined
        }
        isRejected={isRejected}
      />
    </section>
  );
}
