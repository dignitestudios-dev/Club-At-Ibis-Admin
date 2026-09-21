import { db, delay } from "@/lib/mock/store";
import { logActivity, currentAdminActor } from "@/lib/mock/activity";
import { describeChanges } from "@/lib/category-diff";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normaliseFields(fields: CategoryField[]): CategoryField[] {
  return fields.map((f, i) => ({
    ...f,
    label: f.label.trim(),
    helpText: f.helpText?.trim() ? f.helpText.trim() : undefined,
    order: i + 1,
  }));
}

function assertUniqueName(categories: Category[], name: string, ignoreId?: string) {
  if (
    categories.some(
      (c) => c.id !== ignoreId && c.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
  ) {
    throw new Error("A category with this name already exists.");
  }
}

export async function getCategories(): Promise<Category[]> {
  return delay(db.getCategories(), 60);
}

export async function createCategory(payload: CategoryDraftPayload): Promise<Category> {
  const categories = db.getCategories();
  assertUniqueName(categories, payload.name);
  const now = new Date().toISOString();
  let id = slugify(payload.name);
  if (categories.some((c) => c.id === id)) id = `${id}-${Date.now().toString(36)}`;
  const fields = normaliseFields(payload.fields);
  const category: Category = {
    id,
    name: payload.name.trim(),
    description: payload.description.trim(),
    status: "active",
    fields,
    version: 1,
    versions: [
      {
        version: 1,
        name: payload.name.trim(),
        description: payload.description.trim(),
        fields,
        createdAt: now,
        createdBy: currentAdminActor().name,
        changes: ["Initial form"],
        note: payload.note?.trim() || undefined,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  db.setCategories([...categories, category]);
  logActivity({
    category: "category",
    type: "category_created",
    message: `Created category “${category.name}” (form v1) with ${category.fields.length} configured field${category.fields.length === 1 ? "" : "s"}. Now available to residents.`,
    target: { kind: "category", id, label: category.name },
  });
  return delay(category, 220);
}

/** Saves a new immutable version of the category form. */
function pushVersion(previous: Category, next: CategoryDraftPayload, extraChanges: string[] = []): Category {
  const fields = normaliseFields(next.fields);
  const draft = { name: next.name.trim(), description: next.description.trim(), fields };
  const changes = [...extraChanges, ...describeChanges(previous, draft)];
  if (changes.length === 0) {
    throw new Error("No changes to save — the form is identical to the current version.");
  }
  const version = previous.version + 1;
  const now = new Date().toISOString();
  return {
    ...previous,
    ...draft,
    version,
    versions: [
      ...previous.versions,
      { version, ...draft, createdAt: now, createdBy: currentAdminActor().name, changes, note: next.note?.trim() || undefined },
    ],
    updatedAt: now,
  };
}

export async function updateCategory(id: string, payload: CategoryDraftPayload): Promise<Category> {
  const categories = db.getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found.");
  assertUniqueName(categories, payload.name, id);
  const updated = pushVersion(categories[idx], payload);
  const next = [...categories];
  next[idx] = updated;
  db.setCategories(next);
  logActivity({
    category: "category",
    type: "category_updated",
    message: `Saved “${updated.name}” as form v${updated.version} (${updated.versions[updated.versions.length - 1].changes.length} change${updated.versions[updated.versions.length - 1].changes.length === 1 ? "" : "s"}). Applies to new requests only; earlier versions are kept.`,
    target: { kind: "category", id, label: updated.name },
  });
  return delay(updated, 220);
}

/** Re-applies an old version's form as a brand-new version (history is never rewritten). */
export async function restoreCategoryVersion(id: string, version: number): Promise<Category> {
  const categories = db.getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found.");
  const source = categories[idx].versions.find((v) => v.version === version);
  if (!source) throw new Error("Version not found.");
  if (source.version === categories[idx].version) throw new Error("That is already the current version.");
  assertUniqueName(categories, source.name, id);
  const updated = pushVersion(
    categories[idx],
    { name: source.name, description: source.description, fields: source.fields, note: `Restored from v${version}` },
    [`Restored from v${version}`]
  );
  const next = [...categories];
  next[idx] = updated;
  db.setCategories(next);
  logActivity({
    category: "category",
    type: "category_version_restored",
    message: `Restored “${updated.name}” v${version} as new form v${updated.version}.`,
    target: { kind: "category", id, label: updated.name },
  });
  return delay(updated, 220);
}

export async function archiveCategory(id: string): Promise<Category> {
  const categories = db.getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found.");
  const now = new Date().toISOString();
  const updated: Category = { ...categories[idx], status: "archived", archivedAt: now, updatedAt: now };
  const next = [...categories];
  next[idx] = updated;
  db.setCategories(next);
  logActivity({
    category: "category",
    type: "category_archived",
    message: `Archived category “${updated.name}”. Removed from new-request selection; historical requests preserved.`,
    target: { kind: "category", id, label: updated.name },
  });
  return delay(updated, 180);
}

export async function restoreCategory(id: string): Promise<Category> {
  const categories = db.getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found.");
  const updated: Category = {
    ...categories[idx],
    status: "active",
    archivedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  const next = [...categories];
  next[idx] = updated;
  db.setCategories(next);
  logActivity({
    category: "category",
    type: "category_restored",
    message: `Restored category “${updated.name}”. It is Active again with its saved form configuration.`,
    target: { kind: "category", id, label: updated.name },
  });
  return delay(updated, 180);
}
