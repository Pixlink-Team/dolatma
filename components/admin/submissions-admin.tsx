"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateSubmissionAction, deleteSubmissionAction } from "@/lib/actions/admin-actions";
import type { CampaignSubmission } from "@/lib/types";
import { formatPersianDate, getStatusLabel, maskEmail, maskPhone } from "@/lib/utils";

interface SubmissionsAdminProps {
  initialSubmissions: CampaignSubmission[];
}

export function SubmissionsAdmin({ initialSubmissions }: SubmissionsAdminProps) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [selected, setSelected] = useState<CampaignSubmission | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateStatus = (id: string, status: "pending" | "approved" | "rejected", published?: boolean) => {
    startTransition(async () => {
      await updateSubmissionAction(id, { status, published });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status, published: published ?? (status === "approved"), updatedAt: new Date().toISOString() }
            : s
        )
      );
      toast.success("وضعیت بروزرسانی شد");
      setSelected(null);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مشارکت کاربران</h1>
        <p className="text-sm text-muted-foreground">بررسی و تأیید ارسال‌های کاربران</p>
      </div>

      <AdminDataTable
        data={submissions}
        searchKeys={["title", "participantName", "submissionType"]}
        columns={[
          { key: "title", label: "عنوان" },
          { key: "participantName", label: "شرکت‌کننده" },
          { key: "submissionType", label: "نوع" },
          {
            key: "status",
            label: "وضعیت",
            render: (i) => <Badge status={i.status}>{getStatusLabel(i.status)}</Badge>,
          },
          {
            key: "createdAt",
            label: "تاریخ",
            render: (i) => formatPersianDate(i.createdAt),
          },
        ]}
        onEdit={(item) => setSelected(item)}
        onDelete={(item) => {
          startTransition(async () => {
            await deleteSubmissionAction(item.id);
            setSubmissions((p) => p.filter((s) => s.id !== item.id));
            toast.success("حذف شد");
          });
        }}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>جزئیات ارسال</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div><span className="text-muted-foreground">عنوان: </span>{selected.title}</div>
              <div><span className="text-muted-foreground">نوع: </span>{selected.submissionType}</div>
              <div><span className="text-muted-foreground">شرکت‌کننده: </span>{selected.participantName}</div>
              <div><span className="text-muted-foreground">تلفن: </span>{maskPhone(selected.participantPhone)}</div>
              <div><span className="text-muted-foreground">ایمیل: </span>{maskEmail(selected.participantEmail)}</div>
              <div><span className="text-muted-foreground">متن: </span>{selected.text}</div>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button size="sm" onClick={() => updateStatus(selected.id, "approved", true)} disabled={isPending}>
                  تأیید و انتشار
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "pending", false)} disabled={isPending}>
                  در انتظار
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus(selected.id, "rejected", false)} disabled={isPending}>
                  رد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
