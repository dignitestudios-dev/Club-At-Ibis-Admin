/**
 * Request PDF: a branded, text-based (selectable / searchable) PDF of one request, with the uploaded documents
 * laid out one by one under their titles in a Documents section.
 *
 * - Built with jsPDF's built-in fonts, so no font files are needed. jsPDF is imported lazily: it is only
 *   downloaded when someone presses the download button.
 * - Layout is fully dynamic: every block is measured before it is drawn, long text wraps (even unbroken
 *   strings), and content flows onto as many pages as it needs. A small request is a one-page summary; a large
 *   one with many fields and documents simply gets more pages.
 * - Images (PNG / JPG / WEBP) are embedded. Other files (PDF, ...) get a document card with their details, since
 *   their pages can't be drawn into the PDF.
 * - The module is app-agnostic: each portal maps its own request record to `RequestPdfInput`.
 */

export interface RequestPdfField {
  label: string;
  value: string;
  required?: boolean;
  /** Reviewer correction note, shown under the answer. */
  note?: string | null;
}

export interface RequestPdfDocument {
  /** The document's title: the form field it was uploaded for. */
  title: string;
  fileId: string;
  name: string;
  size?: number;
  mimeType?: string;
  uploadedAt?: string;
  required?: boolean;
  note?: string | null;
}

export interface RequestPdfInput {
  reference: string;
  categoryName: string;
  title?: string;
  /** Raw request status (`approved`, `changes_required`, ...): picks the chip colour. */
  status: string;
  statusLabel: string;
  submittedAt?: string;
  updatedAt?: string;
  resident?: { name?: string; idNumber?: string; email?: string; phone?: string };
  property?: { address?: string; lotNo?: string };
  reviewer?: string;
  /** Extra label / value pairs for the summary block (deposit, completion date, ...). */
  summary?: { label: string; value: string }[];
  fields: RequestPdfField[];
  documents: RequestPdfDocument[];
  /** Returns a fresh, short-lived download URL for a file. */
  getFileUrl: (fileId: string) => Promise<string>;
  onProgress?: (message: string) => void;
}

type RGB = [number, number, number];

const NAVY: RGB = [17, 38, 54];
const GOLD: RGB = [160, 135, 74];
const IVORY: RGB = [247, 244, 236];
const INK: RGB = [33, 37, 41];
const MUTED: RGB = [108, 117, 125];
const RULE: RGB = [222, 226, 230];
const SOFT: RGB = [248, 249, 250];

const STATUS_COLORS: Record<string, { bg: RGB; fg: RGB }> = {
  approved: { bg: [220, 245, 232], fg: [20, 108, 67] },
  completed: { bg: [214, 240, 240], fg: [13, 110, 110] },
  rejected: { bg: [252, 226, 228], fg: [160, 28, 48] },
  changes_required: { bg: [255, 239, 207], fg: [146, 84, 4] },
  resubmitted: { bg: [236, 227, 250], fg: [95, 52, 160] },
  withdrawn: { bg: [233, 236, 239], fg: [73, 80, 87] },
  under_review: { bg: [218, 236, 252], fg: [12, 84, 150] },
  assigned: { bg: [225, 228, 252], fg: [60, 68, 160] },
  submitted: { bg: [233, 236, 239], fg: [52, 58, 64] },
};

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_FIRST = 128;
const HEADER_NEXT = 54;
const FOOTER_H = 40;
const IMAGE_MAX_H = 380;

/** Standard PDF fonts only cover Latin-1: swap typographic punctuation, drop anything else. */
function clean(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•·]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\n\x20-\x7E¡-ÿ]/g, "");
}

function fmtDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(doc: RequestPdfDocument): "image" | "pdf" | "other" {
  const name = doc.name.toLowerCase();
  const mime = (doc.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return "other";
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function loadStatic(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const data = await blobToDataUrl(await res.blob());
    if (!data) return null;
    const size = await imageSize(data);
    return size ? { data, ...size } : null;
  } catch {
    return null;
  }
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Downloads an uploaded image and re-encodes it as a bounded JPEG, so any format works and the PDF stays small. */
async function loadUploadedImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const source = await blobToDataUrl(await res.blob());
    if (!source) return null;
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = source;
    });
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff"; // flatten transparency
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL("image/jpeg", 0.85), w, h };
  } catch {
    return null;
  }
}

/** Runs `worker` over `items` with at most `limit` in flight, keeping the results in order. */
async function pool<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function buildRequestPdf(input: RequestPdfInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const progress = input.onProgress ?? (() => {});

  progress("Preparing…");
  const [markIvory, markNavy] = await Promise.all([loadStatic("/brand/ibis-mark-ivory.png"), loadStatic("/brand/ibis-mark-navy.png")]);

  // Download every uploaded image up front (a few at a time) so layout can use the real sizes.
  const images = await pool(input.documents, 3, async (d, i) => {
    if (fileKind(d) !== "image") return null;
    progress(`Loading documents (${i + 1} of ${input.documents.length})…`);
    try {
      return await loadUploadedImage(await input.getFileUrl(d.fileId));
    } catch {
      return null;
    }
  });

  progress("Building PDF…");
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  let y = 0;

  const text = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const fill = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const draw = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const bottomLimit = PAGE_H - FOOTER_H - 14;

  /** Wraps `value` to `width`, also breaking words that are wider than the line. */
  function wrap(value: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of clean(value).split("\n")) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      const words = paragraph.split(/\s+/).flatMap((word) => {
        if (doc.getTextWidth(word) <= width) return [word];
        const parts: string[] = [];
        let chunk = "";
        for (const ch of word) {
          if (doc.getTextWidth(chunk + ch) > width) {
            parts.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        if (chunk) parts.push(chunk);
        return parts;
      });
      lines.push(...(doc.splitTextToSize(words.join(" "), width) as string[]));
    }
    return lines;
  }

  function newPage() {
    doc.addPage();
    y = HEADER_NEXT + 14;
  }

  function ensure(height: number) {
    if (y + height > bottomLimit) newPage();
  }

  /* ------------------------------ headers ------------------------------ */
  function firstHeader() {
    fill(NAVY);
    doc.rect(0, 0, PAGE_W, HEADER_FIRST, "F");
    fill(GOLD);
    doc.rect(0, HEADER_FIRST, PAGE_W, 3, "F");
    let textX = MARGIN;
    if (markIvory) {
      const h = 52;
      const w = (markIvory.w / markIvory.h) * h;
      doc.addImage(markIvory.data, "PNG", MARGIN, 38, w, h);
      textX = MARGIN + w + 16;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    text(IVORY);
    doc.text("The Club at Ibis", textX, 62);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    text(GOLD);
    doc.setCharSpace(1.6);
    doc.text("ARCHITECTURAL REVIEW BOARD", textX, 80);
    doc.setCharSpace(0);
    doc.setFontSize(8);
    text([190, 200, 208]);
    doc.text("REQUEST SUMMARY", PAGE_W - MARGIN, 62, { align: "right" });
    y = HEADER_FIRST + 34;
  }

  function runningHeader() {
    // Drawn on pages 2+ at the end (so it never depends on flow position).
    fill(NAVY);
    doc.rect(0, 0, PAGE_W, HEADER_NEXT - 8, "F");
    fill(GOLD);
    doc.rect(0, HEADER_NEXT - 8, PAGE_W, 2, "F");
    let textX = MARGIN;
    if (markIvory) {
      const h = 22;
      const w = (markIvory.w / markIvory.h) * h;
      doc.addImage(markIvory.data, "PNG", MARGIN, 11, w, h);
      textX = MARGIN + w + 10;
    }
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    text(IVORY);
    doc.text("The Club at Ibis", textX, 27);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    text([190, 200, 208]);
    doc.text(clean(input.reference), PAGE_W - MARGIN, 27, { align: "right" });
  }

  function footer(page: number, total: number) {
    draw(RULE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, PAGE_H - FOOTER_H, PAGE_W - MARGIN, PAGE_H - FOOTER_H);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(MUTED);
    doc.text(`The Club at Ibis  |  Architectural Review Board  |  Generated ${fmtDate(new Date().toISOString())}`, MARGIN, PAGE_H - FOOTER_H + 16);
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 16, { align: "right" });
  }

  /* ------------------------------ sections ----------------------------- */
  function chip(label: string, x: number, baseline: number, colors: { bg: RGB; fg: RGB }): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const w = doc.getTextWidth(clean(label).toUpperCase()) + 20;
    fill(colors.bg);
    doc.roundedRect(x, baseline - 12, w, 19, 9.5, 9.5, "F");
    text(colors.fg);
    doc.text(clean(label).toUpperCase(), x + 10, baseline + 1);
    return w;
  }

  function titleBlock() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    text(NAVY);
    doc.text(clean(input.reference), MARGIN, y);
    const refW = doc.getTextWidth(clean(input.reference));
    chip(input.statusLabel, MARGIN + refW + 14, y - 2, STATUS_COLORS[input.status] ?? STATUS_COLORS.submitted);
    y += 22;
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    text(INK);
    for (const line of wrap(input.title && input.title !== input.categoryName ? `${input.categoryName} - ${input.title}` : input.categoryName, CONTENT_W)) {
      ensure(18);
      doc.text(line, MARGIN, y);
      y += 18;
    }
    y += 6;
  }

  function sectionHeading(label: string, count?: number) {
    ensure(44);
    y += 8;
    fill(GOLD);
    doc.rect(MARGIN, y - 11, 3, 15, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    text(NAVY);
    doc.text(clean(label) + (count !== undefined ? `  (${count})` : ""), MARGIN + 11, y + 1);
    y += 10;
    draw(RULE);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 14;
  }

  function summaryGrid() {
    const cells: { label: string; value: string }[] = [];
    const push = (label: string, value?: string | null) => {
      if (value && value.trim()) cells.push({ label, value: value.trim() });
    };
    push("Resident", [input.resident?.name, input.resident?.idNumber ? `#${input.resident.idNumber}` : ""].filter(Boolean).join("  "));
    push("Contact", [input.resident?.email, input.resident?.phone].filter(Boolean).join("  |  "));
    push("Property", input.property?.address);
    push("Lot No.", input.property?.lotNo);
    push("Category", input.categoryName);
    push("Assigned reviewer", input.reviewer);
    push("Submitted", fmtDate(input.submittedAt));
    push("Last update", fmtDate(input.updatedAt));
    (input.summary ?? []).forEach((s) => push(s.label, s.value));

    const colW = (CONTENT_W - 12) / 2;
    const pad = 11;
    for (let i = 0; i < cells.length; i += 2) {
      const row = cells.slice(i, i + 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const measured = row.map((c) => wrap(c.value, colW - pad * 2));
      const h = Math.max(...measured.map((l) => l.length)) * 13 + 31;
      ensure(h + 8);
      row.forEach((c, k) => {
        const x = MARGIN + k * (colW + 12);
        fill(SOFT);
        draw(RULE);
        doc.setLineWidth(0.6);
        doc.roundedRect(x, y, colW, h, 6, 6, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        text(GOLD);
        doc.setCharSpace(0.8);
        doc.text(clean(c.label).toUpperCase(), x + pad, y + 15);
        doc.setCharSpace(0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        text(INK);
        measured[k].forEach((line, li) => doc.text(line, x + pad, y + 29 + li * 13));
      });
      y += h + 8;
    }
    y += 4;
  }

  function fieldsSection() {
    sectionHeading("Project Information", input.fields.length);
    if (input.fields.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      text(MUTED);
      doc.text("No form answers were recorded for this request.", MARGIN, y);
      y += 18;
      return;
    }
    const labelW = 150;
    const valueX = MARGIN + labelW + 12;
    const valueW = CONTENT_W - labelW - 12;
    input.fields.forEach((f, idx) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const labelLines = wrap(f.label.toUpperCase(), labelW);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const valueLines = wrap(f.value && f.value.trim() ? f.value : "Not provided", valueW);
      const noteLines = f.note ? (doc.setFontSize(9), wrap(`Reviewer note: ${f.note}`, valueW - 16)) : [];
      const blockH = Math.max(labelLines.length * 10 + (f.required === false ? 11 : 0), valueLines.length * 13.5) + (noteLines.length ? noteLines.length * 12 + 14 : 0) + 14;

      // Keep a short row together; a very long answer flows line by line across pages.
      if (blockH <= 240) ensure(blockH);
      else ensure(60);

      const top = y;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      text(MUTED);
      doc.setCharSpace(0.4);
      labelLines.forEach((l, i) => doc.text(l, MARGIN, top + 9 + i * 10));
      doc.setCharSpace(0);
      if (f.required === false) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.text("optional", MARGIN, top + 9 + labelLines.length * 10 + 1);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const empty = !f.value || !f.value.trim();
      text(empty ? MUTED : INK);
      if (empty) doc.setFont("helvetica", "italic");
      let ly = top + 10;
      valueLines.forEach((line) => {
        if (ly > bottomLimit) {
          newPage();
          ly = y + 10;
        }
        doc.text(line, valueX, ly);
        ly += 13.5;
      });
      let endY = Math.max(ly - 13.5 + 4, top + labelLines.length * 10 + 6);

      if (noteLines.length) {
        const noteH = noteLines.length * 12 + 10;
        if (endY + noteH > bottomLimit) {
          newPage();
          endY = y;
        }
        fill([255, 246, 224]);
        draw([240, 214, 150]);
        doc.setLineWidth(0.5);
        doc.roundedRect(valueX, endY + 4, valueW, noteH, 4, 4, "FD");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        text([120, 72, 8]);
        noteLines.forEach((l, i) => doc.text(l, valueX + 8, endY + 18 + i * 12));
        endY += noteH + 6;
      }

      y = endY + 8;
      if (idx < input.fields.length - 1) {
        draw(RULE);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y, PAGE_W - MARGIN, y);
        y += 10;
      }
    });
    y += 6;
  }

  function documentsSection() {
    sectionHeading("Documents", input.documents.length);
    if (input.documents.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      text(MUTED);
      doc.text("No documents were uploaded with this request.", MARGIN, y);
      y += 18;
      return;
    }

    input.documents.forEach((d, i) => {
      const kind = fileKind(d);
      const image = images[i];
      const meta = [d.name, fmtSize(d.size), fmtDate(d.uploadedAt) ? `Uploaded ${fmtDate(d.uploadedAt)}` : ""].filter(Boolean).join("  |  ");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      const titleLines = wrap(d.title || d.name, CONTENT_W - 100);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const metaLines = wrap(meta, CONTENT_W - 28);
      const noteLines = d.note ? wrap(`Reviewer note: ${d.note}`, CONTENT_W - 44) : [];
      const headH = 14 + titleLines.length * 15 + metaLines.length * 11 + 10;

      // Image scaled to the card width, bounded in height.
      let imgW = 0;
      let imgH = 0;
      if (image) {
        const maxW = CONTENT_W - 28;
        const scale = Math.min(maxW / image.w, IMAGE_MAX_H / image.h);
        imgW = image.w * scale;
        imgH = image.h * scale;
      }
      const placeholderH = !image ? 46 : 0;
      const bodyH = (image ? imgH + 16 : placeholderH + 8) + (noteLines.length ? noteLines.length * 12 + 16 : 0);
      const total = headH + bodyH;

      ensure(Math.min(total, 260));
      if (y + total > bottomLimit) newPage();

      const top = y;
      fill(SOFT);
      draw(RULE);
      doc.setLineWidth(0.7);
      doc.roundedRect(MARGIN, top, CONTENT_W, total, 7, 7, "FD");
      fill(GOLD);
      doc.rect(MARGIN, top + 10, 3, headH - 18, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      text(NAVY);
      titleLines.forEach((l, k) => doc.text(l, MARGIN + 14, top + 22 + k * 15));
      // type tag
      const tag = kind === "image" ? "IMAGE" : kind === "pdf" ? "PDF" : "FILE";
      doc.setFontSize(7.5);
      const tagW = doc.getTextWidth(tag) + 14;
      fill(kind === "pdf" ? [252, 226, 228] : [218, 236, 252]);
      doc.roundedRect(MARGIN + CONTENT_W - tagW - 12, top + 10, tagW, 15, 7.5, 7.5, "F");
      text(kind === "pdf" ? [160, 28, 48] : [12, 84, 150]);
      doc.text(tag, MARGIN + CONTENT_W - tagW - 5, top + 20.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      text(MUTED);
      metaLines.forEach((l, k) => doc.text(l, MARGIN + 14, top + 22 + titleLines.length * 15 + k * 11 - 3));

      let by = top + headH;
      if (image) {
        const x = MARGIN + (CONTENT_W - imgW) / 2;
        draw(RULE);
        doc.setLineWidth(0.6);
        doc.roundedRect(x - 1, by - 1, imgW + 2, imgH + 2, 3, 3, "S");
        doc.addImage(image.data, "JPEG", x, by, imgW, imgH);
        by += imgH + 16;
      } else {
        fill([255, 255, 255]);
        draw(RULE);
        doc.setLineWidth(0.6);
        doc.roundedRect(MARGIN + 14, by, CONTENT_W - 28, placeholderH, 5, 5, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        text(MUTED);
        const message =
          kind === "image"
            ? "This image could not be loaded into the PDF. Open it in the portal to view it."
            : kind === "pdf"
              ? "PDF document. Its pages are not embedded here; open it in the portal to view the full file."
              : "This file type can't be previewed in the PDF. Open it in the portal to view it.";
        wrap(message, CONTENT_W - 56).forEach((l, k) => doc.text(l, MARGIN + 28, by + 19 + k * 12));
        by += placeholderH + 8;
      }

      if (noteLines.length) {
        const noteH = noteLines.length * 12 + 10;
        fill([255, 246, 224]);
        draw([240, 214, 150]);
        doc.setLineWidth(0.5);
        doc.roundedRect(MARGIN + 14, by, CONTENT_W - 28, noteH, 4, 4, "FD");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        text([120, 72, 8]);
        noteLines.forEach((l, k) => doc.text(l, MARGIN + 22, by + 14 + k * 12));
      }

      y = top + total + 14;
    });
  }

  /* -------------------------------- build ------------------------------ */
  firstHeader();
  titleBlock();
  summaryGrid();
  fieldsSection();
  documentsSection();

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) runningHeader();
    footer(p, pages);
  }
  void markNavy;

  return doc.output("blob");
}

/** Builds the PDF and saves it to the device. */
export async function downloadRequestPdf(input: RequestPdfInput): Promise<void> {
  const blob = await buildRequestPdf(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${clean(input.reference).replace(/[^A-Za-z0-9_-]+/g, "-") || "request"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
