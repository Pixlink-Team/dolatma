import { TaghvimAppShell } from "@/components/admin/taghvim/taghvim-app-shell";
import { assertDefenseCalendarAccess } from "@/lib/taghvim/access";
import type { Metadata } from "next";
import "@/taghvim-src/taghvim.css";

export const metadata: Metadata = {
  title: "تقویم دفاع و سازندگی",
};

export default async function TaghvimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertDefenseCalendarAccess();
  return <TaghvimAppShell>{children}</TaghvimAppShell>;
}
