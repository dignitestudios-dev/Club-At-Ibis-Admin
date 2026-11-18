export type ViewerKind = "image" | "pdf" | "docx" | "xlsx" | "csv" | "text" | "unsupported";

const IMAGE = ["jpg", "jpeg", "png", "webp", "svg", "gif", "avif", "bmp", "ico"];
const TEXT = ["txt", "log", "md", "json", "xml", "rtf"];

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

/** Which in-app viewer can show this file (anything else falls back to Download). */
export function getViewerKind(filename: string): ViewerKind {
  const ext = getFileExtension(filename);
  if (IMAGE.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "xlsx") return "xlsx";
  if (ext === "csv" || ext === "tsv") return "csv";
  if (TEXT.includes(ext)) return "text";
  return "unsupported";
}
