export default function EmployeeVisaStatus() {
  return (
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">Employee portal</p>
      <h1 className="text-4xl font-bold tracking-tight">Visa status</h1>
      <p className="text-lg text-muted-foreground">
        Follow each OPT document step and complete the next action after HR
        approval.
      </p>
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="font-semibold">OPT document progress</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The OPT Receipt, OPT EAD, I-983, and I-20 steps will be displayed here
          in order.
        </p>
      </div>
    </section>
  );
}
