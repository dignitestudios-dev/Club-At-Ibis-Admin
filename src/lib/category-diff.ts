import { FIELD_TYPE_BY_ID, describeAccept } from "@/features/categories/components/field-types";

interface FormLike {
  name: string;
  description: string;
  fields: CategoryField[];
}

/** Human-readable list of what differs between two versions of a category form. */
export function describeChanges(prev: FormLike, next: FormLike): string[] {
  const out: string[] = [];
  if (prev.name !== next.name) out.push(`Renamed category from “${prev.name}” to “${next.name}”`);
  if (prev.description !== next.description) out.push("Updated the category description");

  const prevById = new Map(prev.fields.map((f) => [f.id, f]));
  const nextById = new Map(next.fields.map((f) => [f.id, f]));
  const typeLabel = (t: CategoryFieldType) => FIELD_TYPE_BY_ID.get(t)?.label.toLowerCase() ?? t;

  for (const f of next.fields) {
    const before = prevById.get(f.id);
    if (!before) {
      out.push(`Added ${typeLabel(f.type)} “${f.label}”${f.required ? " (required)" : ""}`);
      continue;
    }
    const bits: string[] = [];
    if (before.label !== f.label) bits.push(`label “${before.label}” → “${f.label}”`);
    if (before.type !== f.type) bits.push(`type ${typeLabel(before.type)} → ${typeLabel(f.type)}`);
    if (before.required !== f.required) bits.push(f.required ? "now required" : "now optional");
    if ((before.helpText ?? "") !== (f.helpText ?? "")) bits.push("help text updated");
    if (JSON.stringify(before.options ?? []) !== JSON.stringify(f.options ?? [])) bits.push("options updated");
    if (describeAccept(before.accept) !== describeAccept(f.accept)) bits.push(`accepted files: ${describeAccept(f.accept)}`);
    if (!!before.multiple !== !!f.multiple) bits.push(f.multiple ? "multiple files allowed" : "single file only");
    if (bits.length) out.push(`Changed “${f.label}”: ${bits.join(", ")}`);
  }
  for (const f of prev.fields) {
    if (!nextById.has(f.id)) out.push(`Removed ${typeLabel(f.type)} “${f.label}”`);
  }

  // Order change among fields that exist in both versions.
  const commonPrev = prev.fields.filter((f) => nextById.has(f.id)).map((f) => f.id);
  const commonNext = next.fields.filter((f) => prevById.has(f.id)).map((f) => f.id);
  if (JSON.stringify(commonPrev) !== JSON.stringify(commonNext)) out.push("Reordered fields");
  return out;
}

export type FieldDiffState = "added" | "removed" | "changed" | "same";

/** Per-field state when comparing `next` against `prev` (for the version viewer). */
export function fieldDiffStates(prev: CategoryField[] | undefined, next: CategoryField[]) {
  const map = new Map<string, FieldDiffState>();
  if (!prev) return map;
  const prevById = new Map(prev.map((f) => [f.id, f]));
  for (const f of next) {
    const b = prevById.get(f.id);
    if (!b) map.set(f.id, "added");
    else if (JSON.stringify({ ...b, order: 0 }) !== JSON.stringify({ ...f, order: 0 })) map.set(f.id, "changed");
    else map.set(f.id, "same");
  }
  return map;
}
