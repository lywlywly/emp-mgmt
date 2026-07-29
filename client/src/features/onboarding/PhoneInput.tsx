import { Input } from "@/components/ui/input";
import type { OnboardingFormData } from "@/lib/onboarding";
import type { ComponentProps } from "react";
import { Controller, type FieldPath, useFormContext } from "react-hook-form";

type PhoneInputProps = Omit<
  ComponentProps<typeof Input>,
  "name" | "onChange" | "value"
> & {
  name: FieldPath<OnboardingFormData>;
};

function formatPhoneNumber(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function PhoneInput({ name, ...props }: PhoneInputProps) {
  const form = useFormContext<OnboardingFormData>();

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Input
          {...props}
          autoComplete="tel"
          inputMode="tel"
          onChange={(event) =>
            field.onChange(formatPhoneNumber(event.target.value))
          }
          onBlur={field.onBlur}
          ref={field.ref}
          name={field.name}
          value={String(field.value ?? "")}
        />
      )}
    />
  );
}
