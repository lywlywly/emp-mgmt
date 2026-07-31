import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileField({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  disabled = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "date" | "email" | "text";
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      {required && <span className="text-destructive"> *</span>}
      <Input
        className="mt-1"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

export function ProfileSection({
  title,
  editing,
  onCancel,
  onEdit,
  onSubmit,
  pending = false,
  children,
}: {
  title: string;
  editing: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
      {editing ? (
        <form onSubmit={onSubmit}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold">{title}</h2>
            <div className="flex gap-2">
              <Button
                onClick={onCancel}
                size="sm"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <SaveButton pending={pending} />
            </div>
          </div>
          {children}
        </form>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold">{title}</h2>
            <Button onClick={onEdit} size="sm" type="button" variant="outline">
              Edit
            </Button>
          </div>
          {children}
        </>
      )}
    </section>
  );
}

export function SaveButton({ pending }: { pending: boolean }) {
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}

export function ProfileDetails({ values }: { values: [string, string][] }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 font-medium capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
