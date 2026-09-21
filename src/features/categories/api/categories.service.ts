import { db, delay } from "@/lib/mock/store";
import { logActivity } from "@/lib/mock/activity";

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
  const category: Category = {
    id,
    name: payload.name.trim(),
    description: payload.description.trim(),
    icon: payload.icon,
    status: "active",
    fields: normaliseFields(payload.fields),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  db.setCategories([...categories, category]);
  logActivity({
    category: "category",
    type: "category_created",
    message: `Created category “${category.name}” with ${category.fields.length} configured field${category.fields.length === 1 ? "" : "s"}. Now available to residents.`,
    target: { kind: "category", id, label: category.name },
  });
  return delay(category, 220);
}

export async function updateCategory(id: string, payload: CategoryDraftPayload): Promise<Category> {
  const categories = db.getCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Category not found.");
  assertUniqueName(categories, payload.name, id);
  const previous = categories[idx];
  const updated: Category = {
    ...previous,
    name: payload.name.trim(),
    description: payload.description.trim(),
    icon: payload.icon,
    fields: normaliseFields(payload.fields),
    version: previous.version + 1,
    updatedAt: new Date().toISOString(),
  };
  const next = [...categories];
  next[idx] = updated;
  db.setCategories(next);
  logActivity({
    category: "category",
    type: "category_updated",
    message: `Updated category “${updated.name}” to form v${updated.version}. Applies to new requests only.`,
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
