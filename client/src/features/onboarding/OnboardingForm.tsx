import { Button } from "@/components/ui/button";
import { ContactsStep } from "@/features/onboarding/ContactsStep";
import { DocumentsReviewStep } from "@/features/onboarding/DocumentsReviewStep";
import {
  onboardingDefaultValues,
  onboardingSteps,
} from "@/features/onboarding/form-data";
import { OnboardingStepRail } from "@/features/onboarding/OnboardingStepRail";
import { PersonalInformationStep } from "@/features/onboarding/PersonalInformationStep";
import { onboardingSchema } from "@/features/onboarding/schema";
import { WorkAuthorizationStep } from "@/features/onboarding/WorkAuthorizationStep";
import type { OnboardingFormData } from "@/lib/onboarding";
import { authMeQueryOptions, queryClient, trpc } from "@/lib/trpc";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

type OnboardingFormProps = {
  isRejected: boolean;
};

export function OnboardingForm({ isRejected }: OnboardingFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(-1);
  const form = useForm<OnboardingFormData>({
    defaultValues: onboardingDefaultValues,
    mode: "onBlur",
    reValidateMode: "onBlur",
    resolver: zodResolver(onboardingSchema),
  });
  const submitApplication = useMutation(
    trpc.onboarding.submit.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: authMeQueryOptions().queryKey,
        }),
    }),
  );

  async function continueToNextStep() {
    const isCurrentStepValid = await form.trigger(
      onboardingSteps[activeStep].fields,
    );

    if (isCurrentStepValid) {
      setCompletedThrough((currentStep) => Math.max(currentStep, activeStep));
      setActiveStep((currentStep) => currentStep + 1);
    }
  }

  async function changeStep(nextStep: number) {
    if (nextStep > activeStep) {
      const isCurrentStepValid = await form.trigger(
        onboardingSteps[activeStep].fields,
      );
      if (!isCurrentStepValid) return;
    }

    setActiveStep(nextStep);
  }

  const step = [
    <PersonalInformationStep key="personal" />,
    <WorkAuthorizationStep key="work-authorization" />,
    <ContactsStep key="contacts" />,
    <DocumentsReviewStep key="documents" />,
  ][activeStep];

  return (
    <FormProvider {...form}>
      <OnboardingStepRail
        activeStep={activeStep}
        completedThrough={completedThrough}
        onStepChange={changeStep}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        <span aria-hidden="true" className="text-destructive">
          *
        </span>{" "}
        Required fields
      </p>
      <form
        onSubmit={form.handleSubmit((data) => submitApplication.mutate(data))}
      >
        <div className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
          {step}
          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
            <Button
              disabled={activeStep === 0}
              onClick={() => setActiveStep((currentStep) => currentStep - 1)}
              type="button"
              variant="outline"
            >
              Back
            </Button>
            {activeStep < onboardingSteps.length - 1 ? (
              <Button onClick={continueToNextStep} type="button">
                Continue
              </Button>
            ) : (
              <Button disabled={submitApplication.isPending} type="submit">
                {submitApplication.isPending
                  ? "Submitting..."
                  : isRejected
                    ? "Resubmit application"
                    : "Submit application"}
              </Button>
            )}
          </div>
          {submitApplication.isError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {submitApplication.error.message}
            </p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
