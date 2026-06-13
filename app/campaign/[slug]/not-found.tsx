import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CampaignNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">کمپین یافت نشد</h1>
        <p className="text-muted-foreground">این کمپین وجود ندارد یا منتشر نشده است.</p>
        <Link href="/">
          <Button>بازگشت به لیست کمپین‌ها</Button>
        </Link>
      </div>
    </div>
  );
}
