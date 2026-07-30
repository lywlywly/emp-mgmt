import { Button } from "@/components/ui/button";
import { ContactsStep } from "@/features/onboarding/ContactsStep";
import { DocumentsReviewStep } from "@/features/onboarding/DocumentsReviewStep";
import {
  onboardingFormValues,
  onboardingSteps,
} from "@/features/onboarding/form-data";
import { OnboardingStepRail } from "@/features/onboarding/OnboardingStepRail";
import { PersonalInformationStep } from "@/features/onboarding/PersonalInformationStep";
import { onboardingSchema } from "@/features/onboarding/schema";
import { WorkAuthorizationStep } from "@/features/onboarding/WorkAuthorizationStep";
import type { OnboardingFormData } from "@/lib/onboarding";
import { uploadFile } from "@/lib/files";
import { queryClient, trpc } from "@/lib/trpc";
import {
  onboardingSubmitInputSchema,
  type OnboardingApplication,
} from "@emp-mgmt/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

type OnboardingFormProps = {
  application?: OnboardingApplication;
  isRejected: boolean;
};

export function OnboardingForm({
  application,
  isRejected,
}: OnboardingFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(-1);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const form = useForm<OnboardingFormData>({
    defaultValues: onboardingFormValues(application?.data),
    mode: "onBlur",
    reValidateMode: "onBlur",
    resolver: zodResolver(onboardingSchema),
  });
  const submitApplication = useMutation(
    trpc.onboarding.submit.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.onboarding.getMine.queryKey(),
        }),
    }),
  );

  async function submit(data: OnboardingFormData) {
    try {
      setSubmissionError(null);
      const documents = await Promise.all(
        data.documents.map(async (document) => {
          if (!document.file && !document.id) {
            throw new Error(`${document.fileName} must be selected again.`);
          }
          if (!document.file) return document;
          return { ...document, ...(await uploadFile(document.file)) };
        }),
      );
      const input = onboardingSubmitInputSchema.parse({
        ...data,
        contact: {
          cellPhone: data.contact.cellPhone,
          workPhone: data.contact.workPhone,
        },
        documents: documents.map(({ kind, id, fileName, mimeType, size }) => ({
          kind,
          id,
          fileName,
          mimeType,
          size,
        })),
      });
      submitApplication.mutate(input);
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Could not submit the application.",
      );
    }
  }

  async function submitApplicationForm() {
    for (const [index, onboardingStep] of onboardingSteps.entries()) {
      const isStepValid = await form.trigger(onboardingStep.fields);
      if (!isStepValid) {
        setActiveStep(index);
        return;
      }
    }

    await submit(form.getValues());
  }

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
        onSubmit={(event) => {
          event.preventDefault();
          void submitApplicationForm();
        }}
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
          {submissionError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {submissionError}
            </p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
