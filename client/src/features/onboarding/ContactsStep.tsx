import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { emptyContact } from "@/features/onboarding/form-data";
import { PhoneInput } from "@/features/onboarding/PhoneInput";
import { RequiredIndicator } from "@/features/onboarding/RequiredIndicator";
import { StepHeading } from "@/features/onboarding/StepHeading";
import type { OnboardingFormData } from "@/lib/onboarding";
import { useFieldArray, useFormContext } from "react-hook-form";

export function ContactsStep() {
  const form = useFormContext<OnboardingFormData>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emergencyContacts",
  });

  return (
    <FieldGroup>
      <StepHeading
        title="Emergency contact and reference"
        description="Add someone we can contact in an emergency and, if applicable, your referral."
      />
      {fields.map((field, index) => (
        <FieldSet key={field.id}>
          <div className="flex items-center justify-between">
            <FieldLegend>Emergency contact {index + 1}</FieldLegend>
            {fields.length > 1 && (
              <Button
                onClick={() => remove(index)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`emergency-first-${field.id}`}>
                First name
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id={`emergency-first-${field.id}`}
                {...form.register(`emergencyContacts.${index}.firstName`)}
              />
              <FieldError
                errors={[
                  form.formState.errors.emergencyContacts?.[index]?.firstName,
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`emergency-last-${field.id}`}>
                Last name
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id={`emergency-last-${field.id}`}
                {...form.register(`emergencyContacts.${index}.lastName`)}
              />
              <FieldError
                errors={[
                  form.formState.errors.emergencyContacts?.[index]?.lastName,
                ]}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`emergency-middle-${field.id}`}>
                Middle name
              </FieldLabel>
              <Input
                id={`emergency-middle-${field.id}`}
                {...form.register(`emergencyContacts.${index}.middleName`)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`emergency-phone-${field.id}`}>
                Phone
              </FieldLabel>
              <PhoneInput
                id={`emergency-phone-${field.id}`}
                name={`emergencyContacts.${index}.phone`}
              />
              <FieldError
                errors={[
                  form.formState.errors.emergencyContacts?.[index]?.phone,
                ]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`emergency-email-${field.id}`}>
                Email
              </FieldLabel>
              <Input
                id={`emergency-email-${field.id}`}
                type="email"
                {...form.register(`emergencyContacts.${index}.email`)}
              />
              <FieldError
                errors={[
                  form.formState.errors.emergencyContacts?.[index]?.email,
                ]}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor={`emergency-relationship-${field.id}`}>
                Relationship
                <RequiredIndicator />
              </FieldLabel>
              <Input
                id={`emergency-relationship-${field.id}`}
                {...form.register(`emergencyContacts.${index}.relationship`)}
              />
              <FieldError
                errors={[
                  form.formState.errors.emergencyContacts?.[index]
                    ?.relationship,
                ]}
              />
            </Field>
          </div>
        </FieldSet>
      ))}
      <Button
        onClick={() => append(emptyContact())}
        size="sm"
        type="button"
        variant="outline"
      >
        Add another contact
      </Button>
      <Separator />
      <FieldSet>
        <FieldLegend>Reference (optional)</FieldLegend>
        <FieldDescription>
          If provided, first name, last name, and relationship are required.
        </FieldDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="reference-first">First name</FieldLabel>
            <Input
              id="reference-first"
              {...form.register("reference.firstName")}
            />
            <FieldError errors={[form.formState.errors.reference?.firstName]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="reference-last">Last name</FieldLabel>
            <Input
              id="reference-last"
              {...form.register("reference.lastName")}
            />
            <FieldError errors={[form.formState.errors.reference?.lastName]} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="reference-middle">Middle name</FieldLabel>
            <Input
              id="reference-middle"
              {...form.register("reference.middleName")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="reference-phone">Phone</FieldLabel>
            <PhoneInput id="reference-phone" name="reference.phone" />
            <FieldError errors={[form.formState.errors.reference?.phone]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="reference-email">Email</FieldLabel>
            <Input
              id="reference-email"
              type="email"
              {...form.register("reference.email")}
            />
            <FieldError errors={[form.formState.errors.reference?.email]} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="reference-relationship">
              Relationship
            </FieldLabel>
            <Input
              id="reference-relationship"
              {...form.register("reference.relationship")}
            />
            <FieldError
              errors={[form.formState.errors.reference?.relationship]}
            />
          </Field>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}
