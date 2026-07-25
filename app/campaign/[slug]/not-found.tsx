import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CampaignNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">راستا یافت نشد</h1>
        <p className="text-muted-foreground">این راستا وجود ندارد یا منتشر نشده است.</p>
        <Button asChild>
          <Link href="/">بازگشت به لیست راستاها</Link>
        </Button>
      </div>
    </div>
  );
}
