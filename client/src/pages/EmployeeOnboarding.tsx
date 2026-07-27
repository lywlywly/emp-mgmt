import { useMockSession } from "@/lib/mock-session";

export default function EmployeeOnboarding() {
  const { data: session } = useMockSession();

  if (!session) {
    return null;
  }

  const { onboardingStatus } = session;

  if (onboardingStatus === "approved") {
    return null;
  }

  const content = {
    not_started: {
      status: "Action required",
      description:
        "Complete your personal information and upload the documents needed for employment and work authorization.",
      heading: "Start your application",
      detail:
        "The onboarding form will collect your contact details, work authorization, emergency contacts, and required documents.",
      action: "Start application",
    },
    pending: {
      status: "Pending review",
      description:
        "Your application has been submitted and is waiting for HR review.",
      heading: "Application submitted",
      detail:
        "You will be able to view your submitted information and uploaded documents here. Editing, profile access, and visa tasks unlock after HR approves your application.",
      action: "View submitted application",
    },
    rejected: {
      status: "Changes required",
      description:
        "HR has requested updates to your onboarding application before it can be approved.",
      heading: "Review feedback and resubmit",
      detail:
        "HR feedback will appear here with the sections that need changes. After updating your application, you can submit it for another review.",
      action: "Review application",
    },
  }[onboardingStatus];

  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">Employee portal</p>
      <h1 className="text-4xl font-bold tracking-tight">
        Onboarding application
      </h1>
      <p className="text-lg text-muted-foreground">{content.description}</p>
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <p className="text-sm font-medium text-primary">
          Status: {content.status}
        </p>
        <h2 className="mt-2 font-semibold">{content.heading}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{content.detail}</p>
        <button
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          type="button"
        >
          {content.action}
        </button>
      </div>
    </section>
  );
}
