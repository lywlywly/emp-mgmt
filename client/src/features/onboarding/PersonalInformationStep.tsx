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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/features/onboarding/PhoneInput";
import { ProfilePictureField } from "@/features/onboarding/ProfilePictureField";
import { RequiredIndicator } from "@/features/onboarding/RequiredIndicator";
import { SsnInput } from "@/features/onboarding/SsnInput";
import { StepHeading } from "@/features/onboarding/StepHeading";
import { usStates } from "@/features/onboarding/us-states";
import type { OnboardingFormData } from "@/lib/onboarding";
import { Controller, useFormContext } from "react-hook-form";

export function PersonalInformationStep() {
  const form = useFormContext<OnboardingFormData>();

  return (
    <FieldGroup>
      <StepHeading
        title="Personal information"
        description="Use your legal name as it appears on official documents."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="first-name">
            First name
            <RequiredIndicator />
          </FieldLabel>
          <Input
            autoComplete="given-name"
            id="first-name"
            {...form.register("name.firstName")}
          />
          <FieldError errors={[form.formState.errors.name?.firstName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="last-name">
            Last name
            <RequiredIndicator />
          </FieldLabel>
          <Input
            autoComplete="family-name"
            id="last-name"
            {...form.register("name.lastName")}
          />
          <FieldError errors={[form.formState.errors.name?.lastName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="middle-name">Middle name</FieldLabel>
          <Input
            autoComplete="additional-name"
            id="middle-name"
            {...form.register("name.middleName")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="preferred-name">Preferred name</FieldLabel>
          <Input
            autoComplete="nickname"
            id="preferred-name"
            {...form.register("name.preferredName")}
          />
        </Field>
      </div>
      <ProfilePictureField />
      <Field>
        <FieldLabel htmlFor="email">
          Email
          <RequiredIndicator />
        </FieldLabel>
        <Input
          autoComplete="email"
          id="email"
          disabled
          {...form.register("contact.email")}
        />
        <FieldDescription>
          This email is associated with your invitation and cannot be changed.
        </FieldDescription>
        <FieldError errors={[form.formState.errors.contact?.email]} />
      </Field>
      <Separator />
      <FieldSet>
        <FieldLegend>Address</FieldLegend>
        <Field>
          <FieldLabel htmlFor="building-or-apt">
            Building or apartment
          </FieldLabel>
          <Input
            autoComplete="address-line2"
            id="building-or-apt"
            {...form.register("address.buildingOrApt")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="street">
            Street
            <RequiredIndicator />
          </FieldLabel>
          <Input
            autoComplete="address-line1"
            id="street"
            {...form.register("address.street")}
          />
          <FieldError errors={[form.formState.errors.address?.street]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="city">
              City
              <RequiredIndicator />
            </FieldLabel>
            <Input
              autoComplete="address-level2"
              id="city"
              {...form.register("address.city")}
            />
            <FieldError errors={[form.formState.errors.address?.city]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="state">
              State
              <RequiredIndicator />
            </FieldLabel>
            <Controller
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <Select
                  modal={false}
                  onValueChange={(value) => {
                    field.onChange(value ?? "");
                    void form.trigger("address.state");
                  }}
                  value={field.value || null}
                >
                  <SelectTrigger className="w-full min-w-0" id="state">
                    <SelectValue
                      className="min-w-0"
                      placeholder="Select a state"
                    />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {usStates.map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.address?.state]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="zip-code">
              ZIP code
              <RequiredIndicator />
            </FieldLabel>
            <Input
              autoComplete="postal-code"
              id="zip-code"
              {...form.register("address.zipCode")}
            />
            <FieldError errors={[form.formState.errors.address?.zipCode]} />
          </Field>
        </div>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Contact</FieldLegend>
        <FieldDescription>U.S. numbers only.</FieldDescription>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="cell-phone">
              Cell phone
              <RequiredIndicator />
            </FieldLabel>
            <PhoneInput id="cell-phone" name="contact.cellPhone" />
            <FieldError errors={[form.formState.errors.contact?.cellPhone]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="work-phone">Work phone</FieldLabel>
            <PhoneInput id="work-phone" name="contact.workPhone" />
            <FieldError errors={[form.formState.errors.contact?.workPhone]} />
          </Field>
        </div>
      </FieldSet>
      <FieldSet>
        <FieldLegend>Identity</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="ssn">
              SSN
              <RequiredIndicator />
            </FieldLabel>
            <SsnInput />
            <FieldError errors={[form.formState.errors.personalDetails?.ssn]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="date-of-birth">
              Date of birth
              <RequiredIndicator />
            </FieldLabel>
            <Input
              id="date-of-birth"
              type="date"
              {...form.register("personalDetails.dateOfBirth")}
            />
            <FieldError
              errors={[form.formState.errors.personalDetails?.dateOfBirth]}
            />
          </Field>
          <Field>
            <FieldLabel>
              Gender
              <RequiredIndicator />
            </FieldLabel>
            <Controller
              control={form.control}
              name="personalDetails.gender"
              render={({ field }) => (
                <Select
                  modal={false}
                  onValueChange={(value) => {
                    field.onChange(value);
                    void form.trigger("personalDetails.gender");
                  }}
                  value={field.value}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue
                      className="min-w-0"
                      placeholder="Select an option"
                    />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="decline">
                      I do not wish to answer
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError
              errors={[form.formState.errors.personalDetails?.gender]}
            />
          </Field>
        </div>
      </FieldSet>
    </FieldGroup>
  );
}
