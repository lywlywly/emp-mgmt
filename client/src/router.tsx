import { useQuery } from "@tanstack/react-query";
import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router";

import AppLayout from "@/layouts/AppLayout";
import { authMeQueryOptions, trpc } from "@/lib/trpc";

const EmployeeOnboarding = lazy(() => import("@/pages/EmployeeOnboarding"));
const EmployeeProfile = lazy(() => import("@/pages/EmployeeProfile"));
const EmployeeVisaStatus = lazy(() => import("@/pages/EmployeeVisaStatus"));
const HrDashboard = lazy(() => import("@/pages/HrDashboard"));
const HrHiringManagement = lazy(() => import("@/pages/HrHiringManagement"));
const HrVisaStatus = lazy(() => import("@/pages/HrVisaStatus"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const HrInvitations = lazy(() => import("@/pages/HrInvitations"));

export function AppRoutes() {
  const { data: session, isError, isPending } = useQuery(authMeQueryOptions());
  const applicationQuery = useQuery(
    trpc.onboarding.getMine.queryOptions(undefined, {
      enabled: session?.role === "employee",
    }),
  );

  if (isPending) {
    return (
      <div className="min-h-screen bg-muted/30">
        <header className="border-b bg-background">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="ml-auto flex gap-2">
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-16">
          <section className="max-w-2xl animate-pulse space-y-6">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-10 w-80 max-w-full rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-full rounded bg-muted" />
              <div className="h-5 w-3/4 rounded bg-muted" />
            </div>
            <div className="h-40 rounded-lg border bg-card" />
          </section>
        </main>
        <div className="sr-only" role="status">
          Checking your session…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6">
        <p className="text-sm text-muted-foreground">
          We could not load your session. Please try again.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (session.role === "employee" && applicationQuery.isPending) {
    return <div className="min-h-screen bg-muted/30" />;
  }

  if (session.role === "hr") {
    return (
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/hr" element={<HrDashboard />} />
          <Route path="/hr/hiring" element={<HrHiringManagement />} />
          <Route path="/hr/visa-status" element={<HrVisaStatus />} />
          <Route path="/hr/invitations" element={<HrInvitations />} />
          <Route path="*" element={<Navigate replace to="/hr" />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/employee/onboarding" element={<EmployeeOnboarding />} />
        {applicationQuery.data?.status === "approved" ? (
          <>
            <Route path="/employee/profile" element={<EmployeeProfile />} />
            <Route
              path="/employee/visa-status"
              element={<EmployeeVisaStatus />}
            />
            <Route
              path="*"
              element={<Navigate replace to="/employee/profile" />}
            />
          </>
        ) : (
          <Route
            path="*"
            element={<Navigate replace to="/employee/onboarding" />}
          />
        )}
      </Route>
    </Routes>
  );
}
