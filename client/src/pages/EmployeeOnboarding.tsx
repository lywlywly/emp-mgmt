import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { OnboardingForm } from "@/features/onboarding/OnboardingForm";
import { SubmittedOnboarding } from "@/features/onboarding/SubmittedOnboarding";
import { authMeQueryOptions, trpc } from "@/lib/trpc";

export default function EmployeeOnboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showRegistrationComplete] = useState(
    location.state?.registrationComplete === true,
  );
  const sessionQuery = useQuery(authMeQueryOptions());
  const applicationQuery = useQuery(trpc.onboarding.getMine.queryOptions());

  useEffect(() => {
    if (location.state?.registrationComplete !== true) return;

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    });
  }, [location, navigate]);

  if (applicationQuery.isPending)
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />;
  if (applicationQuery.isError)
    return (
      <p className="text-sm text-destructive">
        {applicationQuery.error.message}
      </p>
    );
  const application = applicationQuery.data;
  if (application?.status === "approved") {
    const hasOpt = application.data.workAuthorization.type === "f1";
    return (
      <section className="max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Employee portal</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Onboarding complete
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Your onboarding application has been approved by HR.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            to="/employee/profile"
          >
            Visit profile
          </Link>
          {hasOpt && (
            <Link
              className="rounded-md border px-3 py-2 text-sm font-medium"
              to="/employee/visa-status"
            >
              Visit visa status
            </Link>
          )}
        </div>
      </section>
    );
  }
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
      {showRegistrationComplete && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Account created successfully. Welcome to the employee portal.
        </div>
      )}
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
        email={sessionQuery.data?.email ?? ""}
        isRejected={isRejected}
      />
    </section>
  );
}
