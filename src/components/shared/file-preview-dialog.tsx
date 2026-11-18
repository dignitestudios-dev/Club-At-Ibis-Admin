"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize } from "@/utils/format";
import { getFileExtension, getViewerKind } from "./file-viewers/viewer-kind";

const viewerLoading = () => (
  <div className="flex h-full flex-col items-center justify-center text-slate-400">
    <Loader2 className="mb-2 size-8 animate-spin" />
    <p className="text-sm font-medium text-slate-300">Loading preview…</p>
  </div>
);
const ImageViewer = dynamic(() => import("./file-viewers/image-viewer"), { ssr: false, loading: viewerLoading });
const PdfViewer = dynamic(() => import("./file-viewers/pdf-viewer"), { ssr: false, loading: viewerLoading });
const DocxViewer = dynamic(() => import("./file-viewers/docx-viewer"), { ssr: false, loading: viewerLoading });
const TableViewer = dynamic(() => import("./file-viewers/table-viewer"), { ssr: false, loading: viewerLoading });
const TextViewer = dynamic(() => import("./file-viewers/text-viewer"), { ssr: false, loading: viewerLoading });

export interface PreviewableFile {
  id?: string;
  fileId?: string;
  name: string;
  size: number;
  uploadedAt?: string;
  file?: File;
  url?: string;
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
  onRequestDownloadUrl,
}: {
  file: PreviewableFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Fetches a fresh short-lived SAS URL for a submitted file's id. The
   * backend always serves this with `Content-Disposition: attachment`
   * (there's no inline-disposition option), which is exactly right for the
   * Download button but means navigating an <iframe>/<object>/<img> straight
   * to it just downloads the file instead of rendering it. We work around
   * that client-side: fetch the URL's bytes ourselves and build a `blob:`
   * object URL for display — a blob: URL never carries a
   * Content-Disposition header, so it always renders inline regardless of
   * what the origin server said. The raw SAS URL is still used, unfetched,
   * for the actual Download button.
   *
   * Requires the Azure Storage Account/Container's CORS policy to allow GET
   * requests from this app's origin — without that, this fetch fails with a
   * CORS error and preview falls back to "Preview unavailable" (Download
   * still works, since that's a plain navigation, not a fetch).
   */
  onRequestDownloadUrl?: (fileId: string) => Promise<string>;
}) {
  const toast = useToast();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Local in-memory file (not yet uploaded) — already a same-origin blob:
  // URL, renders fine as-is.
  useEffect(() => {
    if (file?.file) {
      const url = URL.createObjectURL(file.file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
  }, [file]);

  // Revoke the previous fetched preview blob whenever a new one replaces it
  // (or the dialog closes/unmounts) — createObjectURL leaks otherwise.
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  useEffect(() => {
    setPreviewBlobUrl(null);
    setRawUrl(null);
    setUrlError(false);

    if (!file || file.file) return;

    let cancelled = false;

    async function load() {
      setLoadingUrl(true);
      try {
        let remoteUrl = file!.url ?? null;
        if (!remoteUrl) {
          const targetFileId = file!.fileId || file!.id;
          if (targetFileId && onRequestDownloadUrl) {
            remoteUrl = await onRequestDownloadUrl(targetFileId);
          }
        }
        if (!remoteUrl) {
          if (!cancelled) setUrlError(true);
          return;
        }
        if (!cancelled) setRawUrl(remoteUrl);

        const res = await fetch(remoteUrl);
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
        } else {
          setPreviewBlobUrl(blobUrl);
        }
      } catch (err) {
        console.error("Failed to load file preview:", err);
        if (!cancelled) setUrlError(true);
      } finally {
        if (!cancelled) setLoadingUrl(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [file, onRequestDownloadUrl]);

  if (!file) return null;

  const ext = getFileExtension(file.name).toUpperCase() || "FILE";
  const kind = getViewerKind(file.name);
  const isImage = kind === "image";
  // What actually renders in the viewport: only same-origin/blob sources,
  // never the raw cross-origin SAS URL (that would just download).
  const displayUrl = objectUrl || previewBlobUrl;
  // What "Open in new window" / Download use: prefer the rendered blob
  // (so a new tab shows the file instead of downloading it too), otherwise
  // fall back to the raw SAS URL.
  const openUrl = displayUrl || rawUrl;

  function triggerDownload(url: string) {
    toast.success("Download started", `Downloading ${file?.name}`);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  async function handleDownload() {
    if (objectUrl) {
      triggerDownload(objectUrl);
      return;
    }
    if (rawUrl) {
      triggerDownload(rawUrl);
      return;
    }
    const targetFileId = file?.fileId || file?.id;
    if (targetFileId && onRequestDownloadUrl) {
      setDownloading(true);
      try {
        const url = await onRequestDownloadUrl(targetFileId);
        triggerDownload(url);
      } catch {
        toast.error("Download unavailable", "The file link couldn't be loaded. Please try again.");
      } finally {
        setDownloading(false);
      }
      return;
    }
    toast.error("Download unavailable", "The file link couldn't be loaded. Please try again.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] h-[85vh] flex flex-col p-0 text-left overflow-hidden border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between text-left [&_[data-slot=dialog-title]]:text-left border-b border-border bg-slate-50/90 dark:bg-card px-5 py-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary">
              {isImage ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="truncate text-sm font-semibold text-foreground">
                  {file.name}
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className="shrink-0 text-[10px] font-bold tracking-wider uppercase bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700"
                >
                  {ext}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {file.size > 0 ? formatFileSize(file.size) : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pr-8">
            {openUrl && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
                aria-label="Open in new window"
                title="Open in new window"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              >
                <ExternalLink className="size-4" />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || (!rawUrl && !objectUrl && !file.id && !file.fileId)}
              aria-label={`Download ${file.name}`}
              className="gap-1.5 text-xs h-8 ml-2 shadow-2xs font-medium"
            >
              {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Download
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Content */}
        <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden bg-slate-950/95 dark:bg-[#070d17]">
          {loadingUrl ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <Loader2 className="size-8 mb-2 animate-spin" />
              <p className="text-sm font-medium text-slate-300">Loading preview…</p>
            </div>
          ) : urlError || !displayUrl ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="size-12 mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">Preview unavailable</p>
              <p className="text-xs text-slate-500 mt-1">The file link could not be loaded. Please try again.</p>
            </div>
          ) : kind === "image" ? (
            <ImageViewer key={displayUrl} url={displayUrl} name={file.name} />
          ) : kind === "pdf" ? (
            <PdfViewer key={displayUrl} url={displayUrl} />
          ) : kind === "docx" ? (
            <DocxViewer key={displayUrl} url={displayUrl} />
          ) : kind === "xlsx" ? (
            <TableViewer key={displayUrl} url={displayUrl} kind="xlsx" />
          ) : kind === "csv" ? (
            <TableViewer key={displayUrl} url={displayUrl} kind="csv" delimiter={ext === "TSV" ? "	" : ","} />
          ) : kind === "text" ? (
            <TextViewer key={displayUrl} url={displayUrl} name={file.name} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 mb-4 shadow-lg">
                <FileText className="size-8 text-primary" />
              </div>
              <p className="text-base font-semibold text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {file.size > 0 ? `${formatFileSize(file.size)} • ` : ""}{ext} Document
              </p>
              <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm">
                A preview isn&apos;t available for {ext} files. Download the file to view its full content.
              </p>
              <Button variant="default" size="sm" onClick={handleDownload} disabled={downloading} className="gap-2 text-xs font-medium">
                {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                Download Document
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-slate-50/90 dark:bg-card px-5 py-3 shrink-0 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs font-medium bg-white dark:bg-slate-800 border-border hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground cursor-pointer shadow-2xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
