import { Input } from "@/components/ui/input";
import type { OnboardingFormData } from "@/lib/onboarding";
import { Controller, useFormContext } from "react-hook-form";

function formatSsn(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 9);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function SsnInput() {
  const form = useFormContext<OnboardingFormData>();

  return (
    <Controller
      control={form.control}
      name="personalDetails.ssn"
      render={({ field }) => (
        <Input
          autoComplete="off"
          id="ssn"
          inputMode="numeric"
          name={field.name}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(formatSsn(event.target.value))}
          ref={field.ref}
          value={field.value}
        />
      )}
    />
  );
}
