import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";

import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function HrEmployeeProfiles() {
  const [search, setSearch] = useState("");
  const employees = useQuery(trpc.hr.listEmployees.queryOptions());
  const matches = useQuery(
    trpc.hr.searchEmployees.queryOptions(
      { query: search },
      { enabled: search.trim().length > 0 },
    ),
  );
  const rows = search.trim() ? matches.data : employees.data?.employees;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">HR portal</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Employee profiles
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {employees.isPending
            ? "Loading employees..."
            : `${employees.data?.total ?? 0} employees`}
        </p>
      </div>

      <Input
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by first, last, or preferred name"
        value={search}
      />

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-200 text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Legal name</th>
              <th className="p-3 font-medium">SSN</th>
              <th className="p-3 font-medium">Work authorization</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((employee) => (
              <tr className="border-b last:border-0" key={employee.userId}>
                <td className="p-3 font-medium">
                  <Link
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    to={`/hr/employees/${employee.userId}`}
                  >
                    {employee.fullName}
                  </Link>
                </td>
                <td className="p-3">{employee.ssn ?? "—"}</td>
                <td className="p-3">{employee.workAuthorization ?? "—"}</td>
                <td className="p-3">{employee.phone ?? "—"}</td>
                <td className="p-3">{employee.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(employees.isError || matches.isError) && (
          <p className="p-4 text-sm text-destructive">
            Could not load employee profiles.
          </p>
        )}
        {!employees.isPending && !matches.isPending && rows?.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            No employees match your search.
          </p>
        )}
      </div>
    </section>
  );
}
