export default function HrDashboard() {
  return (
    <section className="max-w-3xl space-y-6">
      <p className="text-sm font-medium text-primary">HR portal</p>
      <h1 className="text-4xl font-bold tracking-tight">HR dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Review the onboarding and work-authorization tasks that need attention.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">Pending applications</p>
          <p className="mt-2 text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">Documents to review</p>
          <p className="mt-2 text-2xl font-semibold">—</p>
        </div>
        <div className="rounded-lg border bg-card p-5 text-card-foreground">
          <p className="text-sm text-muted-foreground">Open invitations</p>
          <p className="mt-2 text-2xl font-semibold">—</p>
        </div>
      </div>
    </section>
  );
}
