import { onboardingSteps } from "@/features/onboarding/form-data";

type OnboardingStepRailProps = {
  activeStep: number;
  completedThrough: number;
  onStepChange: (step: number) => void | Promise<void>;
};

export function OnboardingStepRail({
  activeStep,
  completedThrough,
  onStepChange,
}: OnboardingStepRailProps) {
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Onboarding steps">
      {onboardingSteps.map((step, index) => {
        const isActive = activeStep === index;
        const isComplete = completedThrough >= index;
        const isAccessible = index <= completedThrough + 1;

        return (
          <li key={step.label}>
            <span
              className="block"
              title={
                isAccessible ? undefined : "Complete the previous step first."
              }
            >
              <button
                className={`flex w-full flex-col items-center gap-1 rounded-md px-1 py-2 text-xs transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-primary/10 text-primary"
                      : isAccessible
                        ? "text-muted-foreground hover:bg-muted"
                        : "cursor-not-allowed text-muted-foreground/60"
                }`}
                disabled={!isAccessible}
                onClick={() => onStepChange(index)}
                type="button"
              >
                <span className="flex size-5 items-center justify-center rounded-full border border-current text-[0.7rem] font-medium">
                  {index + 1}
                </span>
                <span className="hidden sm:block">{step.label}</span>
              </button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
