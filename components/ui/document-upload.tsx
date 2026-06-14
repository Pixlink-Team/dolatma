"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatPersianNumber } from "@/lib/utils";
import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface DocumentUploadProps {
  value: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  onChange: (payload: { url: string; fileName: string; fileSize: number; mimeType: string }) => void;
  label?: string;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${formatPersianNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatPersianNumber(Math.round(bytes / 1024))} KB`;
  return `${formatPersianNumber(Math.round(bytes / (1024 * 1024)))} MB`;
}

export function DocumentUpload({
  value,
  fileName,
  fileSize,
  mimeType,
  onChange,
  label,
  disabled,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "document");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "آپلود ناموفق بود");
      }

      const data = (await response.json()) as {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
      };

      onChange(data);
      toast.success("فایل با موفقیت آپلود شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleUpload(file);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            PDF، Word، Excel یا فایل متنی — حداکثر ۲۵ مگابایت
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={uploading || disabled}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            انتخاب فایل
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      {value && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{fileName ?? "فایل آپلود شده"}</p>
          <p className="text-xs text-muted-foreground">
            {mimeType ?? "document"} {fileSize ? `— ${formatFileSize(fileSize)}` : ""}
          </p>
          <Input value={value} readOnly dir="ltr" className="mt-2 text-xs" />
        </div>
      )}
    </div>
  );
}
