import {
  AlignLeft,
  AtSign,
  CalendarDays,
  CircleDot,
  Clock,
  FileUp,
  Hash,
  ListChecks,
  Phone,
  ChevronsUpDown,
  Type,
  type LucideIcon,
} from "lucide-react";

export interface FieldTypeMeta {
  type: CategoryFieldType;
  label: string;
  icon: LucideIcon;
  hint: string;
}

/** Every field type the form builder can create. */
export const FIELD_TYPES: FieldTypeMeta[] = [
  { type: "text", label: "Short answer", icon: Type, hint: "Address, lot number, contractor name" },
  { type: "textarea", label: "Paragraph", icon: AlignLeft, hint: "Project description, additional details" },
  { type: "number", label: "Number", icon: Hash, hint: "Square footage, quantity, cost" },
  { type: "email", label: "Email", icon: AtSign, hint: "Contractor or contact email" },
  { type: "phone", label: "Phone number", icon: Phone, hint: "Contractor phone" },
  { type: "date", label: "Date", icon: CalendarDays, hint: "Planned start or completion date" },
  { type: "time", label: "Time", icon: Clock, hint: "Working hours, delivery time" },
  { type: "select", label: "Dropdown", icon: ChevronsUpDown, hint: "Pick one from a list" },
  { type: "radio", label: "Multiple choice", icon: CircleDot, hint: "Pick exactly one option" },
  { type: "checkbox", label: "Checkboxes", icon: ListChecks, hint: "Pick one or more options" },
  { type: "file", label: "Document upload", icon: FileUp, hint: "Required document or photo" },
];

export const FIELD_TYPE_BY_ID = new Map(FIELD_TYPES.map((t) => [t.type, t]));

export const CHOICE_TYPES: CategoryFieldType[] = ["select", "radio", "checkbox"];
export const isChoiceType = (t: CategoryFieldType) => CHOICE_TYPES.includes(t);

/** Groups of file types a document field can be limited to. */
export const FILE_GROUPS: { id: string; label: string; detail: string }[] = [
  { id: "images", label: "Images", detail: "PNG, JPG, JPEG, WEBP" },
  { id: "pdf", label: "PDF", detail: "PDF documents (.pdf)" },
  { id: "word", label: "Word", detail: "Word documents (.doc, .docx)" },
];

export function describeAccept(accept?: string[]): string {
  if (!accept || accept.length === 0) return "Images (PNG, JPG, JPEG, WEBP), PDF, Word (DOC, DOCX)";
  return accept
    .map((id) => FILE_GROUPS.find((g) => g.id === id)?.label)
    .filter(Boolean)
    .join(", ");
}
