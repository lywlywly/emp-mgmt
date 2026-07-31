import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { HiringApplicationDetails } from "@/features/hr/HiringApplicationDetails";
import { trpc } from "@/lib/trpc";

export default function HrEmployeeProfile() {
  const { userId } = useParams();
  const profile = useQuery(
    trpc.hr.getEmployeeProfile.queryOptions(
      { userId: userId ?? "" },
      { enabled: Boolean(userId) },
    ),
  );

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Employee profile
        </h1>
      </div>
      {profile.isPending ? (
        <div className="h-96 animate-pulse rounded-lg border bg-muted/40" />
      ) : profile.isError ? (
        <p className="text-sm text-destructive">{profile.error.message}</p>
      ) : profile.data ? (
        <div className="rounded-lg border bg-card p-5 sm:p-6">
          <HiringApplicationDetails profile={profile.data} />
        </div>
      ) : null}
    </section>
  );
}
