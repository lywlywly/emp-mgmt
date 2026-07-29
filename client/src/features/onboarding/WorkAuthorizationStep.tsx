import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RequiredIndicator } from "@/features/onboarding/RequiredIndicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepHeading } from "@/features/onboarding/StepHeading";
import type { OnboardingFormData } from "@/lib/onboarding";
import { Controller, useFormContext, useWatch } from "react-hook-form";

const residentOrCitizenLabels = {
  green_card: "Green Card",
  citizen: "Citizen",
} as const;

export function WorkAuthorizationStep() {
  const form = useFormContext<OnboardingFormData>();
  const workAuthorization = useWatch({
    control: form.control,
    name: "workAuthorization",
  });

  return (
    <FieldGroup>
      <StepHeading
        title="Work authorization"
        description="Tell us how you are currently authorized to work in the United States."
      />
      <Controller
        control={form.control}
        name="workAuthorization.isUsCitizenOrPermanentResident"
        render={({ field }) => (
          <FieldSet>
            <FieldLegend>
              Are you a U.S. citizen or permanent resident?
              <RequiredIndicator />
            </FieldLegend>
            <RadioGroup
              onValueChange={(value) => {
                field.onChange(value === "yes");
                void form.trigger(
                  "workAuthorization.isUsCitizenOrPermanentResident",
                );
              }}
              value={field.value === null ? null : field.value ? "yes" : "no"}
            >
              <Field orientation="horizontal">
                <RadioGroupItem id="citizen-yes" value="yes" />
                <FieldLabel htmlFor="citizen-yes">Yes</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <RadioGroupItem id="citizen-no" value="no" />
                <FieldLabel htmlFor="citizen-no">No</FieldLabel>
              </Field>
            </RadioGroup>
            <FieldError
              errors={[
                form.formState.errors.workAuthorization
                  ?.isUsCitizenOrPermanentResident,
              ]}
            />
          </FieldSet>
        )}
      />
      {workAuthorization?.isUsCitizenOrPermanentResident === true && (
        <Controller
          control={form.control}
          name="workAuthorization.residentOrCitizenType"
          render={({ field }) => (
            <Field>
              <FieldLabel>
                Status
                <RequiredIndicator />
              </FieldLabel>
              <Select
                modal={false}
                onValueChange={(value) => {
                  field.onChange(value);
                  void form.trigger("workAuthorization.residentOrCitizenType");
                }}
                value={field.value}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a status">
                    {field.value ? residentOrCitizenLabels[field.value] : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="green_card">Green Card</SelectItem>
                  <SelectItem value="citizen">Citizen</SelectItem>
                </SelectContent>
              </Select>
              <FieldError
                errors={[
                  form.formState.errors.workAuthorization
                    ?.residentOrCitizenType,
                ]}
              />
            </Field>
          )}
        />
      )}
      {workAuthorization?.isUsCitizenOrPermanentResident === false && (
        <>
          <Controller
            control={form.control}
            name="workAuthorization.type"
            render={({ field }) => (
              <Field>
                <FieldLabel>
                  Work-authorization type
                  <RequiredIndicator />
                </FieldLabel>
                <Select
                  modal={false}
                  onValueChange={(value) => {
                    field.onChange(value);
                    void form.trigger("workAuthorization.type");
                  }}
                  value={field.value}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="h1b">H-1B</SelectItem>
                    <SelectItem value="l2">L-2</SelectItem>
                    <SelectItem value="f1">F-1 (CPT/OPT)</SelectItem>
                    <SelectItem value="h4">H-4</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={[form.formState.errors.workAuthorization?.type]}
                />
              </Field>
            )}
          />
          {workAuthorization.type === "other" && (
            <Field>
              <FieldLabel htmlFor="other-authorization">
                Visa title
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id="other-authorization"
                {...form.register("workAuthorization.otherType")}
              />
              <FieldError
                errors={[form.formState.errors.workAuthorization?.otherType]}
              />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="authorization-start">
                Start date
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id="authorization-start"
                type="date"
                {...form.register("workAuthorization.startDate")}
              />
              <FieldError
                errors={[form.formState.errors.workAuthorization?.startDate]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="authorization-end">
                End date
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id="authorization-end"
                type="date"
                {...form.register("workAuthorization.endDate")}
              />
              <FieldError
                errors={[form.formState.errors.workAuthorization?.endDate]}
              />
            </Field>
          </div>
        </>
      )}
    </FieldGroup>
  );
}
