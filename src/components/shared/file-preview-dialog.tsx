"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
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

export interface PreviewableFile {
  id?: string;
  fileId?: string;
  name: string;
  size: number;
  uploadedAt?: string;
  file?: File;
  url?: string;
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ["jpg", "jpeg", "png", "webp", "svg", "gif", "avif"].includes(ext);
}

function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === "pdf";
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
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

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
    setImageError(false);
    setPreviewBlobUrl(null);
    setRawUrl(null);
    setUrlError(false);
    setZoom(1);

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
  const isImage = isImageFile(file.name);
  const isPdf = isPdfFile(file.name);
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] h-[85vh] flex flex-col p-0 overflow-hidden border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-slate-50/90 dark:bg-card px-5 py-3 shrink-0">
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
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pr-8">
            {isImage && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  aria-label="Zoom out"
                  title="Zoom out"
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                  aria-label="Zoom in"
                  title="Zoom in"
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                >
                  <ZoomIn className="size-4" />
                </Button>
              </>
            )}
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
        <div className="relative flex-1 min-h-0 overflow-auto bg-slate-950/95 dark:bg-[#070d17] flex items-center justify-center p-4">
          {loadingUrl ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Loader2 className="size-8 mb-2 animate-spin" />
              <p className="text-sm font-medium text-slate-300">Loading preview…</p>
            </div>
          ) : urlError || !displayUrl ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <FileText className="size-12 mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">Preview unavailable</p>
              <p className="text-xs text-slate-500 mt-1">The file link could not be loaded. Please try again.</p>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-0 flex flex-col items-center justify-center relative bg-slate-900/50 rounded-lg overflow-hidden">
              <object
                data={`${displayUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full min-h-0 rounded-lg border-0 bg-white"
              >
                <iframe
                  src={`${displayUrl}#toolbar=1&navpanes=0`}
                  title={file.name}
                  className="w-full h-full min-h-0 rounded-lg border-0 bg-white"
                >
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <FileText className="size-12 mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-medium text-slate-300">Unable to display PDF preview inline</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Your browser may not support embedding this PDF document.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(displayUrl, "_blank", "noopener,noreferrer")}
                      className="gap-1.5 text-xs bg-white dark:bg-slate-800 text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                      Open PDF in new tab
                    </Button>
                  </div>
                </iframe>
              </object>
            </div>
          ) : isImage ? (
            imageError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <ImageIcon className="size-12 mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium text-slate-300">Unable to load image preview</p>
                <p className="text-xs text-slate-500 mt-1">The image file could not be displayed or the source is unavailable.</p>
              </div>
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayUrl}
                  alt={file.name}
                  onError={() => setImageError(true)}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                  className="max-h-full max-w-full shrink-0 rounded-lg object-contain shadow-2xl transition-transform duration-200 border border-white/10"
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 max-w-md">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 mb-4 shadow-lg">
                <FileText className="size-8 text-primary" />
              </div>
              <p className="text-base font-semibold text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {formatFileSize(file.size)} • {ext} Document
              </p>
              <p className="text-xs text-slate-500 mt-2 mb-6">
                Direct inline preview is not supported for {ext} files in the browser. Download the file to view its full content.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="gap-2 text-xs font-medium"
              >
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
