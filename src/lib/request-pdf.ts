/**
 * Request PDF: a formal, business-style record of one request (text-based, selectable / searchable).
 *
 * - Sections mirror the request page (request information, resident, project, category, deposit, ...), each a
 *   titled block of bordered label / value cells; the Documents section follows, one titled block per document.
 * - Built with jsPDF's built-in fonts, so no font files are needed. jsPDF is imported lazily: it is only
 *   downloaded when someone presses the download button.
 * - Layout is fully dynamic: every cell is measured before it is drawn, long text wraps (even unbroken
 *   strings), and content flows onto as many pages as it needs.
 * - Uploaded images (PNG / JPG / WEBP) are embedded at a readable size. Other files (PDF, ...) get a plain
 *   "on file" box, since their pages can't be drawn into the PDF.
 * - The module is app-agnostic: each portal maps its own request record to `RequestPdfInput`.
 */

export interface RequestPdfRow {
  label: string;
  value: string;
  /** Spans the full width (long answers); otherwise two rows share a line. */
  wide?: boolean;
  /** Reviewer correction note shown under the value. */
  note?: string | null;
}

export interface RequestPdfSection {
  title: string;
  rows: RequestPdfRow[];
}

export interface RequestPdfDocument {
  /** The document's title: the form field it was uploaded for. */
  title: string;
  fileId: string;
  /** Only used to recognise the file type; never printed. */
  name: string;
  mimeType?: string;
  note?: string | null;
}

export interface RequestPdfInput {
  reference: string;
  categoryName: string;
  statusLabel: string;
  sections: RequestPdfSection[];
  documents: RequestPdfDocument[];
  /** Returns a fresh, short-lived download URL for a file. */
  getFileUrl: (fileId: string) => Promise<string>;
  onProgress?: (message: string) => void;
}

type RGB = [number, number, number];

const NAVY: RGB = [17, 38, 54];
const INK: RGB = [28, 32, 36];
const MUTED: RGB = [96, 104, 112];
const BORDER: RGB = [190, 196, 202];
const BAND: RGB = [238, 241, 244];
const SOFT_FILL: RGB = [246, 247, 249];
const NOTE_BG: RGB = [250, 246, 235];
const NOTE_BORDER: RGB = [214, 196, 150];

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H = 38;
const TOP_FIRST = 52;
const TOP_NEXT = 50;
const IMAGE_MAX_H = 400;
const CELL_PAD = 8;

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

function today(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

function loadElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = src;
  });
}

async function loadStatic(src: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const data = await blobToDataUrl(await res.blob());
    if (!data) return null;
    const img = await loadElement(data);
    return img ? { data, w: img.naturalWidth, h: img.naturalHeight } : null;
  } catch {
    return null;
  }
}

/** Downloads an uploaded image and re-encodes it as a bounded JPEG, so any format works and the PDF stays small. */
async function loadUploadedImage(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const source = await blobToDataUrl(await res.blob());
    if (!source) return null;
    const img = await loadElement(source);
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const MAX = 1800;
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
    return { data: canvas.toDataURL("image/jpeg", 0.88), w, h };
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
  const mark = await loadStatic("/brand/ibis-mark-navy.png");

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
  let y = TOP_FIRST;

  const text = (rgb: RGB) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const fill = (rgb: RGB) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const draw = (rgb: RGB) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const bottomLimit = PAGE_H - FOOTER_H - 16;

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
    y = TOP_NEXT + 22;
  }

  function ensure(height: number) {
    if (y + height > bottomLimit) newPage();
  }

  /* ------------------------------ letterhead ----------------------------- */
  function letterhead() {
    let textX = MARGIN;
    if (mark) {
      const h = 36;
      const w = (mark.w / mark.h) * h;
      doc.addImage(mark.data, "PNG", MARGIN, y - 4, w, h);
      textX = MARGIN + w + 12;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    text(NAVY);
    doc.text("The Club at Ibis", textX, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    text(MUTED);
    doc.text("Architectural Review Board", textX, y + 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    text(NAVY);
    doc.text("ARCHITECTURAL REQUEST RECORD", PAGE_W - MARGIN, y + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    text(MUTED);
    doc.text(`Reference: ${clean(input.reference)}`, PAGE_W - MARGIN, y + 26, { align: "right" });

    y += 44;
    fill(NAVY);
    doc.rect(MARGIN, y, CONTENT_W, 2, "F");
    y += 18;
  }

  function runningHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    text(NAVY);
    doc.text("The Club at Ibis  |  Architectural Review Board", MARGIN, 34);
    doc.setFont("helvetica", "normal");
    text(MUTED);
    doc.text(`Reference: ${clean(input.reference)}`, PAGE_W - MARGIN, 34, { align: "right" });
    fill(NAVY);
    doc.rect(MARGIN, 42, CONTENT_W, 1, "F");
  }

  function footer(page: number, total: number) {
    draw(BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_H - FOOTER_H, PAGE_W - MARGIN, PAGE_H - FOOTER_H);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(MUTED);
    doc.text(`Generated ${today()}  |  Confidential: contains resident information`, MARGIN, PAGE_H - FOOTER_H + 15);
    doc.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - FOOTER_H + 15, { align: "right" });
  }

  /* ------------------------------ sections ------------------------------- */
  function titleBlock() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    text(INK);
    for (const line of wrap(input.categoryName || "Architectural Request", CONTENT_W - 140)) {
      doc.text(line, MARGIN, y + 6);
      y += 22;
    }
    // status: a plain bordered label, top right of the title
    const label = `STATUS: ${clean(input.statusLabel).toUpperCase()}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    const w = doc.getTextWidth(label) + 18;
    draw(NAVY);
    doc.setLineWidth(0.9);
    doc.rect(PAGE_W - MARGIN - w, y - 22, w, 20, "S");
    text(NAVY);
    doc.text(label, PAGE_W - MARGIN - w + 9, y - 9);
    y += 8;
  }

  function sectionHeader(title: string, withRows = true) {
    ensure(withRows ? 76 : 40);
    fill(BAND);
    draw(BORDER);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, y, CONTENT_W, 22, "FD");
    fill(NAVY);
    doc.rect(MARGIN, y, 3, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    text(NAVY);
    doc.setCharSpace(0.7);
    doc.text(clean(title).toUpperCase(), MARGIN + 12, y + 14.5);
    doc.setCharSpace(0);
    y += 22;
  }

  /** One bordered cell: small label over the value, with an optional note below. Returns its height. */
  function cellHeight(row: RequestPdfRow, width: number): { h: number; value: string[]; note: string[]; label: string[] } {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const label = wrap(row.label.toUpperCase(), width - CELL_PAD * 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const value = wrap(row.value && row.value.trim() ? row.value : "Not provided", width - CELL_PAD * 2);
    doc.setFontSize(8.5);
    const note = row.note ? wrap(`Reviewer note: ${row.note}`, width - CELL_PAD * 2 - 14) : [];
    const h = CELL_PAD + label.length * 9 + 4 + value.length * 13 + (note.length ? note.length * 11 + 16 : 0) + CELL_PAD - 2;
    return { h, value, note, label };
  }

  function drawCell(row: RequestPdfRow, x: number, top: number, width: number, height: number, m: ReturnType<typeof cellHeight>) {
    draw(BORDER);
    doc.setLineWidth(0.6);
    doc.rect(x, top, width, height, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    text(MUTED);
    doc.setCharSpace(0.4);
    m.label.forEach((l, i) => doc.text(l, x + CELL_PAD, top + CELL_PAD + 5 + i * 9));
    doc.setCharSpace(0);
    const empty = !row.value || !row.value.trim();
    doc.setFont("helvetica", empty ? "italic" : "normal");
    doc.setFontSize(10);
    text(empty ? MUTED : INK);
    const vy = top + CELL_PAD + m.label.length * 9 + 12;
    m.value.forEach((l, i) => doc.text(l, x + CELL_PAD, vy + i * 13));
    if (m.note.length) {
      const ny = vy + (m.value.length - 1) * 13 + 10;
      const nh = m.note.length * 11 + 8;
      fill(NOTE_BG);
      draw(NOTE_BORDER);
      doc.setLineWidth(0.5);
      doc.rect(x + CELL_PAD, ny, width - CELL_PAD * 2, nh, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      text([110, 82, 20]);
      m.note.forEach((l, i) => doc.text(l, x + CELL_PAD + 7, ny + 12 + i * 11));
    }
  }

  function section(s: RequestPdfSection) {
    if (!s.rows.length) return;
    sectionHeader(s.title);
    const half = CONTENT_W / 2;
    let i = 0;
    while (i < s.rows.length) {
      const row = s.rows[i];
      const next = s.rows[i + 1];
      const pair = !row.wide && next && !next.wide;
      if (pair) {
        const a = cellHeight(row, half);
        const b = cellHeight(next, half);
        const h = Math.max(a.h, b.h);
        if (h <= 300) ensure(h);
        else ensure(80);
        drawCell(row, MARGIN, y, half, h, a);
        drawCell(next, MARGIN + half, y, half, h, b);
        y += h;
        i += 2;
      } else {
        const m = cellHeight(row, CONTENT_W);
        if (m.h <= 300) {
          ensure(m.h);
          drawCell(row, MARGIN, y, CONTENT_W, m.h, m);
          y += m.h;
        } else {
          // A very long answer: lay it out line by line across as many pages as needed.
          drawLongCell(row, m);
        }
        i += 1;
      }
    }
    y += 16;
  }

  function drawLongCell(row: RequestPdfRow, m: ReturnType<typeof cellHeight>) {
    ensure(70);
    let top = y;
    draw(BORDER);
    doc.setLineWidth(0.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    text(MUTED);
    doc.setCharSpace(0.4);
    m.label.forEach((l, i) => doc.text(l, MARGIN + CELL_PAD, top + CELL_PAD + 5 + i * 9));
    doc.setCharSpace(0);
    let ly = top + CELL_PAD + m.label.length * 9 + 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    text(INK);
    for (const line of m.value) {
      if (ly + 6 > bottomLimit) {
        doc.rect(MARGIN, top, CONTENT_W, bottomLimit - top, "S");
        newPage();
        top = y;
        ly = top + CELL_PAD + 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        text(INK);
      }
      doc.text(line, MARGIN + CELL_PAD, ly);
      ly += 13;
    }
    let endY = ly - 13 + CELL_PAD;
    if (m.note.length) {
      const nh = m.note.length * 11 + 8;
      if (endY + nh + 8 > bottomLimit) {
        doc.rect(MARGIN, top, CONTENT_W, bottomLimit - top, "S");
        newPage();
        top = y;
        endY = top;
      }
      fill(NOTE_BG);
      draw(NOTE_BORDER);
      doc.rect(MARGIN + CELL_PAD, endY + 2, CONTENT_W - CELL_PAD * 2, nh, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      text([110, 82, 20]);
      m.note.forEach((l, i) => doc.text(l, MARGIN + CELL_PAD + 7, endY + 14 + i * 11));
      endY += nh + 8;
    }
    draw(BORDER);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, top, CONTENT_W, endY - top, "S");
    y = endY;
  }

  function documentsSection() {
    sectionHeader("Documents", false);
    if (input.documents.length === 0) {
      ensure(40);
      draw(BORDER);
      doc.setLineWidth(0.6);
      doc.rect(MARGIN, y, CONTENT_W, 34, "S");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      text(MUTED);
      doc.text("No documents were uploaded with this request.", MARGIN + CELL_PAD, y + 21);
      y += 50;
      return;
    }

    // Group files by title so one titled block can hold several files.
    const groups: { title: string; items: { d: RequestPdfDocument; i: number }[] }[] = [];
    input.documents.forEach((d, i) => {
      const g = groups.find((x) => x.title === d.title);
      if (g) g.items.push({ d, i });
      else groups.push({ title: d.title, items: [{ d, i }] });
    });

    groups.forEach((g, gi) => {
      g.items.forEach(({ d, i }, k) => {
        const image = images[i];
        const kind = fileKind(d);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        const titleText = g.items.length > 1 ? `${g.title}  (${k + 1} of ${g.items.length})` : g.title;
        const titleLines = wrap(titleText, CONTENT_W - CELL_PAD * 2);
        const titleH = CELL_PAD + titleLines.length * 14 + 4;

        let imgW = 0;
        let imgH = 0;
        if (image) {
          const maxW = CONTENT_W - CELL_PAD * 2;
          const scale = Math.min(maxW / image.w, IMAGE_MAX_H / image.h, 1.6);
          imgW = image.w * scale;
          imgH = image.h * scale;
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const noteLines = d.note ? wrap(`Reviewer note: ${d.note}`, CONTENT_W - CELL_PAD * 2 - 14) : [];
        const placeholderH = image ? 0 : 44;
        const bodyH = (image ? imgH + CELL_PAD * 2 : placeholderH + CELL_PAD * 2) + (noteLines.length ? noteLines.length * 11 + 16 : 0);
        const total = titleH + bodyH;

        ensure(Math.min(total, 200));
        if (y + total > bottomLimit) newPage();
        const top = y;

        draw(BORDER);
        doc.setLineWidth(0.6);
        doc.rect(MARGIN, top, CONTENT_W, total, "S");
        // title row
        fill(SOFT_FILL);
        doc.rect(MARGIN, top, CONTENT_W, titleH, "F");
        draw(BORDER);
        doc.line(MARGIN, top + titleH, MARGIN + CONTENT_W, top + titleH);
        doc.rect(MARGIN, top, CONTENT_W, total, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        text(NAVY);
        titleLines.forEach((l, li) => doc.text(l, MARGIN + CELL_PAD, top + CELL_PAD + 9 + li * 14));

        let by = top + titleH + CELL_PAD;
        if (image) {
          const x = MARGIN + (CONTENT_W - imgW) / 2;
          doc.addImage(image.data, "JPEG", x, by, imgW, imgH);
          draw(BORDER);
          doc.setLineWidth(0.5);
          doc.rect(x, by, imgW, imgH, "S");
          by += imgH + CELL_PAD;
        } else {
          draw(BORDER);
          doc.setLineWidth(0.5);
          doc.rect(MARGIN + CELL_PAD, by, CONTENT_W - CELL_PAD * 2, placeholderH, "S");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          text(MUTED);
          const message =
            kind === "image"
              ? "Image on file. It could not be loaded into this copy; it is available in the portal."
              : kind === "pdf"
                ? "PDF document on file. Its pages are not reproduced in this copy; it is available in the portal."
                : "Document on file. It is available in the portal.";
          wrap(message, CONTENT_W - CELL_PAD * 4).forEach((l, li) => doc.text(l, MARGIN + CELL_PAD * 2, by + 18 + li * 12));
          by += placeholderH + CELL_PAD;
        }

        if (noteLines.length) {
          const nh = noteLines.length * 11 + 8;
          fill(NOTE_BG);
          draw(NOTE_BORDER);
          doc.setLineWidth(0.5);
          doc.rect(MARGIN + CELL_PAD, by, CONTENT_W - CELL_PAD * 2, nh, "FD");
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          text([110, 82, 20]);
          noteLines.forEach((l, li) => doc.text(l, MARGIN + CELL_PAD + 7, by + 12 + li * 11));
        }
        y = top + total + 12;
      });
      void gi;
    });
  }

  /* --------------------------------- build ------------------------------- */
  letterhead();
  titleBlock();
  input.sections.forEach(section);
  documentsSection();

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) runningHeader();
    footer(p, pages);
  }

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
