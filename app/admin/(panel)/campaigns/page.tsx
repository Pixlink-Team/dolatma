import { redirect } from "next/navigation";

/** Multi-campaign management removed — single fixed campaign only. */
export default function CampaignsPage() {
  redirect("/admin/settings");
}
