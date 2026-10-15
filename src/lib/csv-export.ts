import axiosInstance from "@/lib/axios";

export type CsvExportOutcome =
  | { ok: true; filename: string }
  | { ok: false; kind: "no_matches" | "rate_limited" | "forbidden" | "failed"; message: string };

type ExportPath = "/admin/reports/requests.csv" | "/reviewer/reports/requests.csv";

function fallbackFilename(): string {
  return `request-report-${new Date().toISOString().slice(0, 10)}.csv`;
}

function filenameFrom(disposition?: string | null): string {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? "");
  return match ? decodeURIComponent(match[1]) : fallbackFilename();
}

/**
 * Downloads every request the user may export that matches `filters` (the same filters as the list, without
 * page / limit). The server builds the CSV: it is not paginated, excludes file data, and protects cells
 * against spreadsheet formulas. Failures are returned (never thrown) so the caller can show a clear message.
 */
export async function downloadRequestsCsv(path: ExportPath, filters: object): Promise<CsvExportOutcome> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(filters) as [string, unknown][]) {
    if (key === "page" || key === "limit") continue;
    if (value === undefined || value === null || value === "" || value === "all") continue;
    params[key] = value as string | number;
  }

  try {
    // validateStatus: every status resolves, so the JSON error body of a failed export can be read.
    const res = await axiosInstance.get<Blob>(path, { params, responseType: "blob", validateStatus: () => true });

    if (res.status === 200) {
      const filename = filenameFrom(res.headers?.["content-disposition"] as string | undefined);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      return { ok: true, filename };
    }

    let code = "";
    let message = "";
    try {
      const body = JSON.parse(await res.data.text());
      code = body?.code ?? "";
      message = body?.message ?? "";
    } catch {
      /* not JSON */
    }
    if (res.status === 404 || code === "EXPORT_NO_MATCHES") {
      return { ok: false, kind: "no_matches", message: "No requests match the current search and filters, so there is nothing to export." };
    }
    if (res.status === 429) {
      return { ok: false, kind: "rate_limited", message: "Too many exports in a short time. Please wait a minute and try again." };
    }
    if (res.status === 403) {
      return { ok: false, kind: "forbidden", message: message || "You don't have access to export these requests." };
    }
    return { ok: false, kind: "failed", message: message || "The export failed. Please try again." };
  } catch {
    return { ok: false, kind: "failed", message: "The export failed. Check your connection and try again." };
  }
}
