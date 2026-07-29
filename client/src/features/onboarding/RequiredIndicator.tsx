export function RequiredIndicator() {
  return (
    <span className="text-destructive" title="Required">
      <span aria-hidden="true"> *</span>
      <span className="sr-only"> required</span>
    </span>
  );
}
