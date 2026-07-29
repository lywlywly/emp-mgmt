import { NavLink, Outlet } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { authMeQueryOptions } from "@/lib/trpc";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  }`;

function AppLayout() {
  const { data: session } = useQuery(authMeQueryOptions());

  if (!session) {
    return null;
  }

  const { onboardingStatus, user, workAuthorization } = session;
  const onboardingComplete = onboardingStatus === "approved";
  const isEmployee = user.role === "employee";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
          <NavLink className="font-semibold" to="/">
            Employee Manager
          </NavLink>
          <span className="text-sm text-muted-foreground">
            {isEmployee ? "Employee portal" : "HR portal"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isEmployee ? (
              <>
                {!onboardingComplete && (
                  <NavLink className={navLinkClass} to="/employee/onboarding">
                    Onboarding
                  </NavLink>
                )}
                {onboardingComplete && (
                  <>
                    <NavLink className={navLinkClass} to="/employee/profile">
                      Profile
                    </NavLink>
                    {workAuthorization === "opt" && (
                      <NavLink
                        className={navLinkClass}
                        to="/employee/visa-status"
                      >
                        Visa status
                      </NavLink>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <NavLink className={navLinkClass} end to="/hr">
                  Dashboard
                </NavLink>
                <NavLink className={navLinkClass} to="/hr/hiring">
                  Hiring management
                </NavLink>
              </>
            )}
            <button className={navLinkClass({ isActive: false })} type="button">
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Suspense
          fallback={
            <section className="max-w-2xl animate-pulse space-y-6">
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-10 w-80 max-w-full rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-5 w-full rounded bg-muted" />
                <div className="h-5 w-3/4 rounded bg-muted" />
              </div>
              <div className="h-64 rounded-lg border bg-card" />
            </section>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default AppLayout;
