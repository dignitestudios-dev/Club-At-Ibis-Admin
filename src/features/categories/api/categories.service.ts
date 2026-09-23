import axiosInstance from "@/lib/axios";

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoriesPageResult {
  categories: Category[];
  pagination: ApiPagination;
}

export interface CategoryVersionsResult {
  category: Category;
  versions: CategoryVersion[];
}

function toCategory(raw: any): Category {
  const currentVersion = raw.currentVersion ?? raw.version ?? 1;
  return {
    id: raw.id || raw._id,
    slug: raw.slug,
    name: raw.name ?? "",
    description: raw.description ?? "",
    status: raw.status ?? "active",
    currentVersion,
    version: currentVersion,
    fields: raw.fields ? raw.fields.map(toField) : (raw.currentForm?.fields ? raw.currentForm.fields.map(toField) : []),
    versions: raw.versions ? raw.versions.map(toVersion) : undefined,
    currentForm: raw.currentForm ? toVersion(raw.currentForm) : undefined,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    archivedAt: raw.archivedAt ?? null,
  };
}

function toField(f: any): CategoryField {
  return {
    id: f.id,
    label: f.label ?? "",
    type: f.type,
    required: !!f.required,
    helpText: f.helpText ?? undefined,
    options: f.options ? [...f.options] : undefined,
    accept: f.accept ? [...f.accept] : undefined,
    multiple: f.multiple !== undefined ? !!f.multiple : undefined,
    order: typeof f.order === "number" ? f.order : 0,
  };
}

function toVersion(raw: any): CategoryVersion {
  return {
    id: raw.id || raw._id,
    categoryId: raw.categoryId,
    version: raw.version,
    name: raw.name ?? "",
    description: raw.description ?? "",
    fields: raw.fields ? raw.fields.map(toField) : [],
    note: raw.note ?? null,
    changes: raw.changes ?? [],
    changeSummaries: raw.changeSummaries ?? [],
    restoredFromVersion: raw.restoredFromVersion ?? null,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
  };
}

function toCommonForm(raw: any): CommonForm {
  return {
    key: raw.key,
    currentVersion: raw.currentVersion,
    fields: raw.fields ? raw.fields.map(toField) : [],
    note: raw.note ?? null,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
  };
}

/**
 * Fetch the common/fixed form questions displayed at the top of every resident form.
 */
export async function getCommonForm(): Promise<CommonForm> {
  const { data } = await axiosInstance.get("/admin/categories/common-form");
  return toCommonForm(data.data.commonForm);
}

/**
 * Paginated and filtered categories list from the backend.
 */
export async function getCategoriesPage({
  page = 1,
  limit = 20,
  search = "",
  status,
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "archived";
} = {}): Promise<CategoriesPageResult> {
  const params: Record<string, unknown> = { page, limit };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;

  const { data } = await axiosInstance.get("/admin/categories", { params });
  return {
    categories: (data.data.categories as any[]).map(toCategory),
    pagination: data.pagination,
  };
}

/**
 * Convenience helper to fetch all categories (up to limit) for dropdowns and pickers.
 */
export async function getCategories(limit = 100): Promise<Category[]> {
  const result = await getCategoriesPage({ page: 1, limit });
  return result.categories;
}

/**
 * Fetch a single category by its ID along with its current form definition.
 */
export async function getCategory(categoryId: string): Promise<Category> {
  const { data } = await axiosInstance.get(`/admin/categories/${categoryId}`);
  return toCategory(data.data.category);
}

/**
 * Create a new category and its form version 1.
 */
export async function createCategory(payload: CategoryDraftPayload): Promise<Category> {
  const body = {
    name: payload.name.trim(),
    description: payload.description.trim(),
    note: payload.note?.trim() || undefined,
    fields: payload.fields.map((f) => ({
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      helpText: f.helpText?.trim() || undefined,
      options: f.options && f.options.length ? f.options.map((o) => o.trim()) : undefined,
      accept: f.accept && f.accept.length ? f.accept : undefined,
      multiple: f.multiple,
    })),
  };

  const { data } = await axiosInstance.post("/admin/categories", body);
  return toCategory(data.data.category);
}

/**
 * Publish a new category form version (e.g. v2, v3).
 */
export async function updateCategory(categoryId: string, payload: CategoryDraftPayload): Promise<Category> {
  const body = {
    expectedVersion: payload.expectedVersion,
    name: payload.name.trim(),
    description: payload.description.trim(),
    note: payload.note?.trim() || undefined,
    fields: payload.fields.map((f) => ({
      id: f.id || undefined, // Send existing UUID if present; backend assigns UUID if omitted
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      helpText: f.helpText?.trim() || undefined,
      options: f.options && f.options.length ? f.options.map((o) => o.trim()) : undefined,
      accept: f.accept && f.accept.length ? f.accept : undefined,
      multiple: f.multiple,
    })),
  };

  const { data } = await axiosInstance.patch(`/admin/categories/${categoryId}`, body);
  return toCategory(data.data.category);
}

/**
 * Archive or restore a category.
 */
export async function setCategoryStatus(categoryId: string, status: "active" | "archived"): Promise<Category> {
  const { data } = await axiosInstance.patch(`/admin/categories/${categoryId}/status`, { status });
  return toCategory(data.data.category);
}

export async function archiveCategory(categoryId: string): Promise<Category> {
  return setCategoryStatus(categoryId, "archived");
}

export async function restoreCategory(categoryId: string): Promise<Category> {
  return setCategoryStatus(categoryId, "active");
}

/**
 * Retrieve the full version history for a category (newest first).
 */
export async function getCategoryVersions(categoryId: string): Promise<CategoryVersionsResult> {
  const { data } = await axiosInstance.get(`/admin/categories/${categoryId}/versions`);
  return {
    category: toCategory(data.data.category),
    versions: (data.data.versions as any[]).map(toVersion),
  };
}

/**
 * Fetch a specific version of a category form.
 */
export async function getCategoryVersion(categoryId: string, version: number): Promise<CategoryVersion> {
  const { data } = await axiosInstance.get(`/admin/categories/${categoryId}/versions/${version}`);
  return toVersion(data.data.version);
}

/**
 * Compare two category form versions and receive backend diff & summaries.
 */
export async function compareCategoryVersions(
  categoryId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionComparison> {
  const { data } = await axiosInstance.get(`/admin/categories/${categoryId}/version-comparison`, {
    params: { fromVersion, toVersion },
  });
  return data.data.comparison;
}

/**
 * Restore an older form version as a brand-new immutable version.
 */
export async function restoreCategoryVersion(
  categoryId: string,
  version: number,
  payload?: { expectedVersion?: number; note?: string }
): Promise<Category> {
  const body = {
    expectedVersion: payload?.expectedVersion,
    note: payload?.note?.trim() || undefined,
  };
  const { data } = await axiosInstance.post(`/admin/categories/${categoryId}/versions/${version}/restore`, body);
  return toCategory(data.data.category);
}
