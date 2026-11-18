"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { ViewerToolbar } from "./viewer-toolbar";
import { useDragScroll } from "./use-drag-scroll";

type Cell = string | number | boolean | Date | null | undefined;
interface Sheet {
  name: string;
  rows: Cell[][];
}

const MAX_ROWS = 2000;

/** Minimal CSV/TSV parser (quoted fields, escaped quotes, CRLF). */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function show(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toLocaleDateString();
  return String(cell);
}

/** Excel (.xlsx) workbooks and CSV/TSV files as scrollable, zoomable tables with sheet tabs. */
export default function TableViewer({ url, kind, delimiter = "," }: { url: string; kind: "xlsx" | "csv"; delimiter?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [active, setActive] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [zoom, setZoom] = useState(1);
  useDragScroll(scroller);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetch(url).then((r) => r.blob());
        let result: Sheet[];
        if (kind === "xlsx") {
          const { default: readExcelFile } = await import("read-excel-file/browser");
          const all = await readExcelFile(blob);
          result = all.map((s) => ({ name: s.sheet, rows: s.data as Cell[][] }));
        } else {
          result = [{ name: "Data", rows: parseDelimited(await blob.text(), delimiter) }];
        }
        if (cancelled) return;
        setSheets(result);
        setActive(0);
        setState("ready");
      } catch (err) {
        console.error("Table preview failed:", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, kind, delimiter]);

  if (state === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-400">
        <Loader2 className="mb-2 size-8 animate-spin" />
        <p className="text-sm font-medium text-slate-300">Loading spreadsheet…</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
        <FileText className="mb-2 size-12 opacity-40" />
        <p className="text-sm font-medium text-slate-300">Unable to display this file</p>
        <p className="mt-1 text-xs text-slate-500">Use Download to open it in Excel.</p>
      </div>
    );
  }

  const sheet = sheets[active];
  const rows = sheet?.rows.slice(0, MAX_ROWS) ?? [];
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white" style={{ cursor: zoom > 1 ? "grab" : undefined }}>
        <table className="border-collapse text-left text-xs text-slate-900" style={{ zoom }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i === 0 ? "bg-slate-100 font-semibold" : "odd:bg-white even:bg-slate-50/70"}>
                <td className="sticky left-0 border border-slate-200 bg-slate-100 px-2 py-1 text-center text-[10px] text-slate-500">{i + 1}</td>
                {Array.from({ length: cols }, (_, c) => (
                  <td key={c} className="max-w-[28rem] border border-slate-200 px-2 py-1 whitespace-pre-wrap align-top">
                    {show(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sheet && sheet.rows.length > MAX_ROWS && (
          <p className="p-3 text-center text-xs text-slate-500">Showing the first {MAX_ROWS.toLocaleString()} of {sheet.rows.length.toLocaleString()} rows. Download the file to see everything.</p>
        )}
      </div>
      {sheets.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-slate-900 px-2 py-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.name + i}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${i === active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <ViewerToolbar
        label={`${Math.round(zoom * 100)}%`}
        onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
        onReset={() => setZoom(1)}
        canZoomIn={zoom < 2.5}
        canZoomOut={zoom > 0.5}
      />
    </div>
  );
}
