/** Prominent red asterisk shown next to the label of a required field. */
export function RequiredMark() {
  return (
    <span className="ml-0.5 text-base leading-none font-bold text-red-600 dark:text-red-400" aria-hidden="true" title="Required">
      *
    </span>
  );
}
