type StepHeadingProps = {
  title: string;
  description: string;
};

export function StepHeading({ title, description }: StepHeadingProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
