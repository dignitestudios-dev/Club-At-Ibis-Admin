"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  GripVertical,
  Info,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/shared/required-mark";
import { ICON_LIBRARY, SUGGESTED_ICON_NAMES, getCategoryIcon } from "@/features/categories/components/category-icons";
import { FIELD_TYPES, FIELD_TYPE_BY_ID, FILE_GROUPS, describeAccept, isChoiceType } from "@/features/categories/components/field-types";
import { useCategories, useCreateCategory, useRequests, useUpdateCategory } from "@/hooks/use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { baseProjectFields } from "@/lib/mock/categories";
import { cn } from "@/utils/cn";

interface DraftField extends CategoryField {
  /** Stable React key that survives reordering. */
  key: string;
}

function newFieldId(label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "field";
  return `${slug}-${Math.random().toString(36).slice(2, 6)}`;
}

function toDraft(fields: CategoryField[]): DraftField[] {
  return fields.map((f) => ({ ...f, key: f.id }));
}

/** Stable string of everything the user can edit — used to detect unsaved changes. */
function snapshot(name: string, description: string, icon: string, fields: DraftField[]) {
  return JSON.stringify({
    name: name.trim(),
    description: description.trim(),
    icon,
    fields: fields.map(({ key: _key, order: _order, ...f }) => ({
      ...f,
      label: f.label.trim(),
      helpText: (f.helpText ?? "").trim(),
      options: f.options ?? [],
      accept: f.accept ?? [],
      multiple: !!f.multiple,
    })),
  });
}

export default function CategoryBuilder({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data: categories, isLoading } = useCategories();
  const { data: requests } = useRequests();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const existing = categoryId ? categories?.find((c) => c.id === categoryId) : undefined;

  if (categoryId && isLoading) return <Spinner className="mx-auto mt-24 size-6" />;
  if (categoryId && !existing) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="font-heading text-xl">Category not found</p>
        <Button nativeButton={false} render={<Link href="/categories" />}>
          Back to categories
        </Button>
      </div>
    );
  }

  return (
    <BuilderForm
      key={existing?.id ?? "new"}
      existing={existing}
      existingRequestCount={(requests ?? []).filter((r) => r.categoryId === categoryId).length}
      create={create}
      update={update}
      toast={toast}
      onDone={() => router.push("/categories")}
      allNames={(categories ?? []).filter((c) => c.id !== categoryId).map((c) => c.name.toLowerCase())}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Icon picker — tiles look exactly like the icon on a category card    */
/* ------------------------------------------------------------------ */

function IconPicker({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const suggested = SUGGESTED_ICON_NAMES.map((n) => ICON_LIBRARY.find((e) => e.name === n)!).filter(Boolean);
  const results = q ? ICON_LIBRARY.filter((e) => `${e.name} ${e.keywords}`.toLowerCase().includes(q)) : suggested;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${ICON_LIBRARY.length} icons — e.g. “pool”, “solar”, “roof”`}
          className="bg-card pl-9"
          aria-label="Search icons"
        />
      </div>
      <div className="max-h-72 overflow-y-auto pr-1 custom-scrollbar">
        <p className="pb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {q ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Suggested · search to see more"}
        </p>
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No icons match “{query}”.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6" role="radiogroup" aria-label="Category icon">
            {results.map(({ name, icon: Icon }) => {
              const selected = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(name)}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center outline-none transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/50",
                    selected ? "border-primary ring-2 ring-primary/25 dark:border-amber-400 dark:ring-amber-400/25" : "border-border"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
                      selected ? "border-primary bg-primary text-primary-foreground dark:border-amber-400 dark:bg-amber-400 dark:text-[#0d1522]" : "border-primary/20 bg-primary/10 text-primary dark:text-amber-300"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="w-full truncate text-[11px] text-muted-foreground">{name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field card — collapsed preview / expanded editor                     */
/* ------------------------------------------------------------------ */

function OptionsEditor({ field, onChange }: { field: DraftField; onChange: (options: string[]) => void }) {
  const options = field.options ?? [];
  const marker = (i: number) =>
    field.type === "radio" ? (
      <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/50" />
    ) : field.type === "checkbox" ? (
      <span className="size-4 shrink-0 rounded-[4px] border-2 border-muted-foreground/50" />
    ) : (
      <span className="w-4 shrink-0 text-center text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
    );

  return (
    <div className="space-y-1.5">
      {options.map((opt, i) => (
        <div key={i} className="group/opt flex items-center gap-2.5">
          {marker(i)}
          <Input
            value={opt}
            onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
            placeholder={`Option ${i + 1}`}
            aria-label={`Option ${i + 1}`}
            className="h-9 rounded-none border-0 border-b border-border/70 bg-transparent px-1 shadow-none focus-visible:border-primary focus-visible:ring-0"
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            disabled={options.length <= 1}
            aria-label={`Remove option ${i + 1}`}
            className="text-muted-foreground"
          >
            <X />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""])}
        className="ml-6.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary dark:hover:text-amber-300"
      >
        <Plus className="size-3.5" />
        Add option
      </button>
    </div>
  );
}

function FileConfig({ field, onPatch }: { field: DraftField; onPatch: (p: Partial<CategoryField>) => void }) {
  const any = !field.accept || field.accept.length === 0;
  const accept = field.accept ?? [];
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Accepted file types</p>
          <p className="text-xs text-muted-foreground">{any ? "Any file type is accepted (default)." : "Only the selected types can be uploaded."}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
          <Switch checked={any} onCheckedChange={(v) => onPatch({ accept: v ? [] : ["images", "pdf"] })} aria-label="Accept any file type" />
          Any type
        </label>
      </div>
      {!any && (
        <div className="grid gap-2 sm:grid-cols-2">
          {FILE_GROUPS.map((g) => {
            const on = accept.includes(g.id);
            return (
              <label
                key={g.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors",
                  on ? "border-primary bg-primary/5 dark:border-amber-400 dark:bg-amber-400/5" : "border-border bg-card hover:border-foreground/30"
                )}
              >
                <Checkbox checked={on} onCheckedChange={(v) => onPatch({ accept: v ? [...accept, g.id] : accept.filter((x) => x !== g.id) })} aria-label={g.label} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{g.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{g.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
        <Switch checked={!!field.multiple} onCheckedChange={(v) => onPatch({ multiple: v })} aria-label="Allow multiple files" />
        Allow more than one file
      </label>
    </div>
  );
}

/** What the resident's control looks like — shown when a card is collapsed. */
function FieldPreview({ field }: { field: DraftField }) {
  const line = "h-7 border-b border-dashed border-border text-xs leading-7 text-muted-foreground/70";
  if (field.type === "select" || field.type === "radio" || field.type === "checkbox") {
    return (
      <ul className="space-y-1">
        {(field.options ?? []).slice(0, 4).map((o, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            {field.type === "radio" ? <span className="size-3.5 rounded-full border-2 border-muted-foreground/40" /> : field.type === "checkbox" ? <span className="size-3.5 rounded-[3px] border-2 border-muted-foreground/40" /> : <span className="w-3.5 text-center text-xs">{i + 1}.</span>}
            {o || <span className="italic">Empty option</span>}
          </li>
        ))}
        {(field.options ?? []).length > 4 && <li className="pl-5 text-xs text-muted-foreground">+ {(field.options ?? []).length - 4} more</li>}
      </ul>
    );
  }
  if (field.type === "file") {
    return (
      <p className="text-xs text-muted-foreground">
        Upload · {describeAccept(field.accept)}
        {field.multiple ? " · multiple files" : ""}
      </p>
    );
  }
  const text: Record<string, string> = {
    text: "Short answer text",
    textarea: "Long answer text",
    number: "Number",
    email: "name@example.com",
    phone: "(555) 000-0000",
    date: "Month, day, year",
    time: "Time",
  };
  return <div className={cn(line, field.type === "textarea" ? "w-full" : "w-1/2")}>{text[field.type]}</div>;
}

function FieldCard({
  field,
  index,
  total,
  active,
  error,
  dragOver,
  onActivate,
  onPatch,
  onChangeType,
  onDuplicate,
  onRemove,
  onMove,
  onHandleDragStart,
  dropProps,
}: {
  field: DraftField;
  index: number;
  total: number;
  active: boolean;
  error?: string;
  dragOver: boolean;
  onActivate: () => void;
  onPatch: (p: Partial<CategoryField>) => void;
  onChangeType: (t: CategoryFieldType) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onHandleDragStart: (e: React.DragEvent<HTMLElement>, card: HTMLElement | null) => void;
  dropProps: React.HTMLAttributes<HTMLLIElement>;
}) {
  const meta = FIELD_TYPE_BY_ID.get(field.type)!;
  const Icon = meta.icon;
  const typeItems = FIELD_TYPES.map((t) => ({ label: t.label, value: t.type }));
  const cardRef = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={cardRef}
      {...dropProps}
      className={cn(
        "group/field relative flex overflow-hidden rounded-2xl border bg-card shadow-2xs transition-all",
        active ? "border-primary/40 shadow-md ring-1 ring-primary/20 dark:border-amber-400/50 dark:ring-amber-400/20" : "border-border hover:border-foreground/25",
        dragOver && "border-primary ring-2 ring-primary/30 dark:border-amber-400",
        error && "border-destructive/60"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        draggable
        onDragStart={(e) => onHandleDragStart(e, cardRef.current)}
        aria-label={`Drag to reorder field ${index + 1}`}
        title="Drag to reorder"
        className={cn(
          "flex w-9 shrink-0 cursor-grab flex-col items-center justify-start gap-1 border-r pt-4 text-muted-foreground/60 outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted active:cursor-grabbing",
          active ? "border-primary/20 bg-primary/5 dark:bg-amber-400/5" : "border-border/70 bg-muted/30"
        )}
      >
        <GripVertical className="size-4" aria-hidden="true" />
        <span className="text-[11px] font-bold tabular-nums">{index + 1}</span>
      </button>

      <div className="min-w-0 flex-1">
        {!active ? (
          /* Collapsed — click to edit */
          <div role="button" tabIndex={0} onClick={onActivate} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onActivate())} className="w-full cursor-pointer space-y-2 px-5 py-4 text-left outline-none focus-visible:bg-muted/40">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-base font-medium", field.label ? "text-foreground" : "text-muted-foreground italic")}>
                {field.label || "Untitled field"}
              </span>
              {field.required && <RequiredMark />}
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:text-amber-300">
                <Icon className="size-3" aria-hidden="true" />
                {meta.label}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover/field:opacity-100">
                <Pencil className="size-3" aria-hidden="true" />
                Edit
              </span>
            </div>
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            <FieldPreview field={field} />
            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          </div>
        ) : (
          /* Expanded editor */
          <div className="space-y-4 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-2">
                <label htmlFor={`label-${field.key}`} className="flex items-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Field label
                  <RequiredMark />
                </label>
                <Input
                  id={`label-${field.key}`}
                  value={field.label}
                  onChange={(e) => onPatch({ label: e.target.value })}
                  placeholder="Shown to the resident, e.g. Site plan / survey"
                  aria-invalid={!!error}
                  autoFocus={!field.label}
                  className="h-11 rounded-none border-0 border-b-2 border-border bg-muted/40 px-3 text-base font-medium shadow-none focus-visible:border-primary focus-visible:ring-0 dark:bg-muted/30"
                />
                <label htmlFor={`help-${field.key}`} className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Help text <span className="font-normal tracking-normal normal-case">(optional)</span>
                </label>
                <Input
                  id={`help-${field.key}`}
                  value={field.helpText ?? ""}
                  onChange={(e) => onPatch({ helpText: e.target.value })}
                  placeholder="Instructions for filling in or uploading"
                  className="h-9 rounded-none border-0 border-b border-border bg-transparent px-3 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0"
                />
              </div>
              <div className="w-full shrink-0 space-y-2 sm:w-52">
                <span className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Field type</span>
                <Select items={typeItems} value={field.type} onValueChange={(v) => v && onChangeType(v as CategoryFieldType)}>
                  <SelectTrigger className="w-full" aria-label="Field type">
                    <Icon className="size-4 text-primary dark:text-amber-300" aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        <t.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

            {isChoiceType(field.type) && <OptionsEditor field={field} onChange={(options) => onPatch({ options })} />}
            {field.type === "file" && <FileConfig field={field} onPatch={onPatch} />}
            {!isChoiceType(field.type) && field.type !== "file" && <FieldPreview field={field} />}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move field up">
                  <ArrowUp />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move field down">
                  <ArrowDown />
                </Button>
                <span className="mx-1.5 h-5 w-px bg-border" aria-hidden="true" />
                <Button variant="ghost" size="icon-sm" onClick={onDuplicate} aria-label="Duplicate field" title="Duplicate">
                  <Copy />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove field" title="Delete" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 />
                </Button>
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                <span className={field.required ? "text-foreground" : "text-muted-foreground"}>{field.required ? "Required" : "Optional"}</span>
                <Switch checked={field.required} onCheckedChange={(v) => onPatch({ required: v })} aria-label="Required" />
              </label>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Builder                                                              */
/* ------------------------------------------------------------------ */

function BuilderForm({
  existing,
  existingRequestCount,
  create,
  update,
  toast,
  onDone,
  allNames,
}: {
  existing?: Category;
  existingRequestCount: number;
  create: ReturnType<typeof useCreateCategory>;
  update: ReturnType<typeof useUpdateCategory>;
  toast: ReturnType<typeof useToast>;
  onDone: () => void;
  allNames: string[];
}) {
  const editing = !!existing;
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "");
  const [pickingIcon, setPickingIcon] = useState(false);
  const [fields, setFields] = useState<DraftField[]>(() => toDraft(existing?.fields ?? []));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; fields: Record<string, string> }>({ fields: {} });
  const dragKey = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const initial = useRef(snapshot(existing?.name ?? "", existing?.description ?? "", existing?.icon ?? "", toDraft(existing?.fields ?? [])));
  const dirty = useMemo(() => snapshot(name, description, icon, fields) !== initial.current, [name, description, icon, fields]);
  const guard = useUnsavedChanges(dirty);
  const saving = create.isPending || update.isPending;

  function addField(type: CategoryFieldType) {
    const key = crypto.randomUUID();
    const draft: DraftField = {
      key,
      id: newFieldId(""),
      label: "",
      type,
      required: type === "file",
      helpText: "",
      order: 0,
      options: isChoiceType(type) ? ["Option 1"] : undefined,
      accept: type === "file" ? [] : undefined,
    };
    // New fields land right below the one being edited (like Google Forms).
    setFields((prev) => {
      const at = activeKey ? prev.findIndex((f) => f.key === activeKey) : -1;
      if (at < 0) return [...prev, draft];
      const next = [...prev];
      next.splice(at + 1, 0, draft);
      return next;
    });
    setActiveKey(key);
    requestAnimationFrame(() => document.getElementById(`label-${key}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function patch(key: string, changes: Partial<CategoryField>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...changes } : f)));
    setErrors((e) => ({ ...e, fields: { ...e.fields, [key]: "" } }));
  }

  function changeType(key: string, type: CategoryFieldType) {
    setFields((prev) =>
      prev.map((f) =>
        f.key === key
          ? {
              ...f,
              type,
              options: isChoiceType(type) ? (f.options && f.options.length ? f.options : ["Option 1"]) : undefined,
              accept: type === "file" ? f.accept ?? [] : undefined,
              multiple: type === "file" ? f.multiple : undefined,
            }
          : f
      )
    );
  }

  function duplicate(key: string) {
    const copyKey = crypto.randomUUID();
    setFields((prev) => {
      const i = prev.findIndex((f) => f.key === key);
      if (i < 0) return prev;
      const copy: DraftField = { ...prev[i], key: copyKey, id: newFieldId(prev[i].label), label: prev[i].label ? `${prev[i].label} (copy)` : "" };
      const next = [...prev];
      next.splice(i + 1, 0, copy);
      return next;
    });
    setActiveKey(copyKey);
  }

  function move(key: string, delta: number) {
    setFields((prev) => {
      const i = prev.findIndex((f) => f.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function dropOn(targetKey: string) {
    const from = dragKey.current;
    dragKey.current = null;
    setDragOver(null);
    if (!from || from === targetKey) return;
    setFields((prev) => {
      const a = prev.findIndex((f) => f.key === from);
      const b = prev.findIndex((f) => f.key === targetKey);
      if (a < 0 || b < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(a, 1);
      next.splice(b, 0, moved);
      return next;
    });
  }

  function validate() {
    const next: typeof errors = { fields: {} };
    if (!name.trim()) next.name = "Category name is required.";
    else if (allNames.includes(name.trim().toLowerCase())) next.name = "A category with this name already exists.";
    const seen = new Set<string>();
    fields.forEach((f) => {
      const label = f.label.trim().toLowerCase();
      if (!label) next.fields[f.key] = "Give this field a label residents will see.";
      else if (seen.has(label) || baseProjectFields.some((b) => b.label.toLowerCase() === label)) next.fields[f.key] = "Field labels must be unique within a form.";
      else if (isChoiceType(f.type)) {
        const opts = (f.options ?? []).map((o) => o.trim());
        if (opts.length === 0 || opts.some((o) => !o)) next.fields[f.key] = "Every option needs a value — fill in or remove empty options.";
        else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) next.fields[f.key] = "Options must be unique.";
      }
      seen.add(label);
    });
    setErrors(next);
    const firstBad = fields.find((f) => next.fields[f.key]);
    if (firstBad) setActiveKey(firstBad.key);
    return !next.name && !firstBad;
  }

  function save() {
    if (!validate()) {
      toast.error("Fix the highlighted items", "Some fields need attention before saving.");
      return;
    }
    const payload: CategoryDraftPayload = {
      name,
      description,
      icon,
      fields: fields.map(({ key: _key, ...f }, i) => ({
        ...f,
        order: i + 1,
        options: isChoiceType(f.type) ? (f.options ?? []).map((o) => o.trim()) : undefined,
        accept: f.type === "file" ? f.accept ?? [] : undefined,
        multiple: f.type === "file" ? !!f.multiple : undefined,
      })),
    };
    const finish = () => {
      guard.allowLeave();
      onDone();
    };
    if (existing) {
      update.mutate(
        { id: existing.id, payload },
        {
          onSuccess: (updated) => {
            toast.success("Category updated", `“${updated.name}” is now form v${updated.version}. Applies to new requests only.`);
            finish();
          },
          onError: (e: Error) => toast.error("Could not save", e.message),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Category created", `“${created.name}” is Active and available to residents.`);
          finish();
        },
        onError: (e: Error) => toast.error("Could not save", e.message),
      });
    }
  }

  const HeaderIcon = getCategoryIcon(icon);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
      <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Categories &amp; forms
      </Link>

      {/* Sticky action bar (kept clear of the top bar) */}
      <div className="sticky top-[4.5rem] z-20 flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-medium text-foreground">{editing ? `Edit ${existing?.name}` : "Add category"}</h1>
          <p className="text-xs text-muted-foreground">
            {editing ? `Form v${existing?.version} → v${(existing?.version ?? 0) + 1} on save` : "Configure the resident form, then save."}
            {dirty && <span className="ml-2 font-medium text-amber-700 dark:text-amber-300">· Unsaved changes</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <Plus className="size-4" />
              Add field
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {FIELD_TYPES.map((t) => (
                <DropdownMenuItem key={t.type} onClick={() => addField(t.type)}>
                  <t.icon />
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" nativeButton={false} render={<Link href="/categories" />}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Spinner className="size-4" /> : <Save className="size-4" />}
            {editing ? "Save changes" : "Save category"}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-300/70 bg-sky-50 p-4 text-sm dark:border-sky-900/70 dark:bg-sky-950/30">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
          <p className="text-sky-950 dark:text-sky-200">
            Updated configuration applies to <span className="font-semibold">new requests only</span>.{" "}
            {existingRequestCount > 0
              ? `The ${existingRequestCount} existing submission${existingRequestCount === 1 ? "" : "s"} keep their original form and data.`
              : "No requests have used this category yet."}
            {existing?.status === "archived" && " This category is archived — restore it from the list to make it available to residents again."}
          </p>
        </div>
      )}

      {/* Category details */}
      <Card className="shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Category details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setPickingIcon((p) => !p)}
              aria-expanded={pickingIcon}
              aria-label="Change icon"
              title="Change icon"
              className="group relative flex size-16 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary outline-none transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-amber-300"
            >
              <HeaderIcon className="size-7" aria-hidden="true" />
              <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs group-hover:text-foreground">
                <Pencil className="size-3" aria-hidden="true" />
              </span>
            </button>
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="cat-name" className="flex items-center text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Category name
                <RequiredMark />
              </label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((er) => ({ ...er, name: undefined }));
                }}
                placeholder="e.g. Solar Panels"
                aria-invalid={!!errors.name}
                className="h-11 rounded-none border-0 border-b-2 border-border bg-transparent px-1 font-heading text-xl shadow-none focus-visible:border-primary focus-visible:ring-0"
              />
              {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cat-desc" className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Short description <span className="font-normal tracking-normal normal-case">(shown to residents when they pick a category)</span>
            </label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Rooftop or ground-mounted solar installations"
              rows={2}
              className="resize-none rounded-none border-0 border-b border-border bg-transparent px-1 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
            <p className="text-sm text-foreground">
              <span className="font-medium">Icon:</span> <span className="text-muted-foreground">{icon || "Default"}</span>
            </p>
            <div className="flex items-center gap-1">
              {icon && (
                <Button variant="ghost" size="sm" onClick={() => setIcon("")}>
                  <X />
                  Use default
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setPickingIcon((p) => !p)}>
                {pickingIcon ? "Done" : "Change icon"}
              </Button>
            </div>
          </div>
          {pickingIcon && <IconPicker value={icon} onChange={setIcon} />}
        </CardContent>
      </Card>

      {/* Standard fields */}
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          <Lock className="size-3" aria-hidden="true" />
          Standard project information · always included
        </p>
        <div className="flex flex-wrap gap-2">
          {baseProjectFields.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs">
              {f.label}
              {f.required && <span className="font-bold text-red-600 dark:text-red-400">*</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Configured fields */}
      <Card className="shadow-2xs">
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="font-heading text-lg font-medium">Form fields</CardTitle>
          <p className="text-xs text-muted-foreground">
            Click a field to edit it. Drag the handle on the left (or use the arrows) to set the display order residents see.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {fields.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No additional fields yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Use “Add field” to create questions, choices and document uploads.</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {fields.map((f, i) => (
                <FieldCard
                  key={f.key}
                  field={f}
                  index={i}
                  total={fields.length}
                  active={activeKey === f.key}
                  error={errors.fields[f.key] || undefined}
                  dragOver={dragOver === f.key}
                  onActivate={() => setActiveKey(f.key)}
                  onPatch={(p) => patch(f.key, p)}
                  onChangeType={(t) => changeType(f.key, t)}
                  onDuplicate={() => duplicate(f.key)}
                  onRemove={() => setFields((prev) => prev.filter((x) => x.key !== f.key))}
                  onMove={(d) => move(f.key, d)}
                  onHandleDragStart={(e, card) => {
                    dragKey.current = f.key;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", f.key);
                    if (card) e.dataTransfer.setDragImage(card, 24, 24);
                  }}
                  dropProps={{
                    onDragOver: (e) => {
                      if (!dragKey.current) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOver(f.key);
                    },
                    onDragLeave: () => setDragOver((d) => (d === f.key ? null : d)),
                    onDrop: (e) => {
                      e.preventDefault();
                      dropOn(f.key);
                    },
                    onDragEnd: () => {
                      dragKey.current = null;
                      setDragOver(null);
                    },
                  }}
                />
              ))}
            </ol>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="w-full border-dashed" />}>
              <Plus className="size-4" />
              Add field{activeKey ? " below this one" : ""}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-64">
              {FIELD_TYPES.map((t) => (
                <DropdownMenuItem key={t.type} onClick={() => addField(t.type)}>
                  <t.icon />
                  <span className="flex-1">{t.label}</span>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">{t.hint.split(",")[0]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      {guard.dialog}
    </div>
  );
}
