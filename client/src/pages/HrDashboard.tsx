import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";

import { trpc } from "@/lib/trpc";

type DashboardCardProps = {
  description: string;
  label: string;
  pending: boolean;
  to: string;
  value: number | undefined;
};

function DashboardCard({
  description,
  label,
  pending,
  to,
  value,
}: DashboardCardProps) {
  return (
    <Link
      className="rounded-lg border bg-card p-5 text-card-foreground transition-colors hover:bg-muted/40"
      to={to}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{pending ? "—" : value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

export default function HrDashboard() {
  const pendingApplications = useQuery(
    trpc.onboarding.listByStatus.queryOptions({ status: "pending" }),
  );
  const visaWorkflows = useQuery(trpc.hr.visaInProgress.queryOptions());
  const invitations = useQuery(trpc.invitation.list.queryOptions());

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">HR dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Review the onboarding and work-authorization tasks that need
          attention.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardCard
          description="Applications awaiting review"
          label="Pending applications"
          pending={pendingApplications.isPending}
          to="/hr/hiring"
          value={pendingApplications.data?.length}
        />
        <DashboardCard
          description="OPT workflow steps in progress"
          label="Documents to review"
          pending={visaWorkflows.isPending}
          to="/hr/visa-status"
          value={
            visaWorkflows.data?.filter(
              (workflow) => workflow.waitingOn === "hr",
            ).length
          }
        />
        <DashboardCard
          description="Invitations not yet submitted"
          label="Open invitations"
          pending={invitations.isPending}
          to="/hr/invitations"
          value={
            invitations.data?.filter(
              (invitation) => invitation.status === "pending",
            ).length
          }
        />
      </div>
      {(pendingApplications.isError ||
        visaWorkflows.isError ||
        invitations.isError) && (
        <p className="text-sm text-destructive" role="alert">
          Some dashboard data could not be loaded. Open the relevant section to
          retry.
        </p>
      )}
    </section>
  );
}
