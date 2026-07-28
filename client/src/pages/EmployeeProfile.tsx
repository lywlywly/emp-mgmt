export default function EmployeeProfile() {
  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">Employee portal</p>
      <h1 className="text-4xl font-bold tracking-tight">My profile</h1>
      <p className="text-lg text-muted-foreground">
        Review and update your personal, contact, and employment information.
      </p>
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">Profile details</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Personal information, emergency contacts, and uploaded documents will
          appear here after onboarding approval.
        </p>
      </div>
    </section>
  );
}
