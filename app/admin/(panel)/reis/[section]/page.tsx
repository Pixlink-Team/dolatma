import { notFound, redirect } from "next/navigation";
import { ReisSectionPlaceholder } from "@/components/admin/reis/reis-section-placeholder";
import {
  getReisSection,
  isReisSectionKey,
  REIS_HOME_PATH,
} from "@/lib/reis/sections";

type ReisSectionPageProps = {
  params: Promise<{ section: string }>;
};

export default async function ReisSectionPage({ params }: ReisSectionPageProps) {
  const { section: sectionKey } = await params;

  if (!isReisSectionKey(sectionKey)) {
    notFound();
  }

  // Dedicated static routes (`campaigns`, `strategic`, `monitoring`) take
  // precedence over this dynamic segment. These redirects are only a fallback.
  if (sectionKey === "campaigns") {
    redirect(`${REIS_HOME_PATH}/campaigns`);
  }
  if (sectionKey === "strategic") {
    redirect(`${REIS_HOME_PATH}/strategic`);
  }
  if (sectionKey === "monitoring") {
    redirect(`${REIS_HOME_PATH}/monitoring`);
  }

  const section = getReisSection(sectionKey);
  if (!section) {
    notFound();
  }

  // External sections are opened from the hub; keep a fallback redirect.
  if (section.external) {
    redirect(section.href);
  }

  if (sectionKey === "defense-calendar") {
    redirect("/admin/taghvim");
  }

  if (sectionKey === "settings") {
    redirect("/admin");
  }

  return <ReisSectionPlaceholder section={section} />;
}
