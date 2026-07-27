export type UserRole = "employee" | "hr";
export type OnboardingStatus =
  "not_started" | "pending" | "rejected" | "approved";

export type MockSession = {
  user: {
    name: string;
    role: UserRole;
  };
  onboardingStatus: OnboardingStatus;
  workAuthorization: "opt" | "other" | null;
};

export const mockSessions: MockSession[] = [
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "not_started",
    workAuthorization: null,
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "pending",
    workAuthorization: "opt",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "rejected",
    workAuthorization: "other",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "other",
  },
  {
    user: { name: "Jordan Lee", role: "employee" },
    onboardingStatus: "approved",
    workAuthorization: "opt",
  },
  {
    user: { name: "Alex Morgan", role: "hr" },
    onboardingStatus: "approved",
    workAuthorization: null,
  },
];

// Change this index to preview a different role or workflow state.
export const activeMockSessionIndex = 0;

export async function getMockSession(): Promise<MockSession> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  return mockSessions[activeMockSessionIndex];
}

export function useMockSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: getMockSession,
    staleTime: Infinity,
  });
}
import { useQuery } from "@tanstack/react-query";
