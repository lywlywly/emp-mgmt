import { useQuery } from "@tanstack/react-query";

import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { SubmittedOnboarding } from "@/features/onboarding/SubmittedOnboarding";
import { authMeQueryOptions, trpc } from "@/lib/trpc";

export default function EmployeeOnboarding() {
  const { data: session } = useQuery(authMeQueryOptions());
  const applicationQuery = useQuery(
    trpc.onboarding.getMine.queryOptions(undefined, {
      enabled: session?.onboardingStatus === "pending",
    }),
  );

  if (!session || session.onboardingStatus === "approved") {
    return null;
  }

  if (session.onboardingStatus === "pending") {
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
        {applicationQuery.data ? (
          <SubmittedOnboarding application={applicationQuery.data} />
        ) : applicationQuery.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {applicationQuery.error.message}
          </p>
        ) : (
          <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
        )}
      </section>
    );
  }

  const isRejected = session.onboardingStatus === "rejected";

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
            Please confirm your work-authorization information and upload the
            required document before resubmitting.
          </p>
        </div>
      )}
      <OnboardingForm isRejected={isRejected} />
    </section>
  );
}
