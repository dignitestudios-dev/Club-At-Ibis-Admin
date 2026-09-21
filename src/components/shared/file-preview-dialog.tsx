"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatFileSize } from "@/utils/format";

export interface PreviewableFile {
  id?: string;
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

// Architectural sample preview images for mock files
function getSampleFileUrl(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("paint") || lower.includes("swatch") || lower.includes("color")) {
    return "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("roof") || lower.includes("tile") || lower.includes("shingle")) {
    return "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("generator") || lower.includes("mechanical") || lower.includes("equipment")) {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("survey") || lower.includes("plan") || lower.includes("drawing") || lower.includes("blueprint") || lower.includes("layout") || lower.includes("spec")) {
    return "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("pool") || lower.includes("deck") || lower.includes("cage") || lower.includes("lanai") || lower.includes("spa")) {
    return "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("window") || lower.includes("door") || lower.includes("shutter")) {
    return "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1400&auto=format&fit=crop";
  }
  if (lower.includes("landscape") || lower.includes("yard") || lower.includes("tree") || lower.includes("plant")) {
    return "https://images.unsplash.com/photo-1558904541-efa8c4a08931?q=80&w=1400&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1400&auto=format&fit=crop";
}

export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
}: {
  file: PreviewableFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (file?.file) {
      const url = URL.createObjectURL(file.file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(file?.url ?? null);
    setZoom(1);
  }, [file]);

  if (!file) return null;

  const ext = getFileExtension(file.name).toUpperCase() || "FILE";
  const isImage = isImageFile(file.name);
  const isPdf = isPdfFile(file.name);
  const displayUrl = objectUrl || file.url || getSampleFileUrl(file.name);

  function handleDownload() {
    toast.success("Download started", `Downloading ${file?.name}`);
    const a = document.createElement("a");
    a.href = displayUrl;
    a.download = file?.name || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border bg-slate-50/90 dark:bg-card px-5 py-3.5">
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
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              aria-label={`Download ${file.name}`}
              className="gap-1.5 text-xs h-8 ml-2 shadow-2xs font-medium"
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>
        </DialogHeader>

        {/* Viewport Content */}
        <div className="relative flex-1 min-h-[420px] max-h-[72vh] overflow-auto bg-slate-950/95 dark:bg-[#070d17] flex items-center justify-center p-4">
          {isPdf && objectUrl && file.file ? (
            <iframe
              src={objectUrl}
              title={file.name}
              className="w-full h-[65vh] rounded-lg border-0 bg-white shadow-lg"
            />
          ) : (
            <div className="overflow-auto max-h-full max-w-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayUrl}
                alt={file.name}
                style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200 border border-white/10"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border bg-slate-50/90 dark:bg-card px-5 py-2.5 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white dark:bg-slate-800 border-border hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
