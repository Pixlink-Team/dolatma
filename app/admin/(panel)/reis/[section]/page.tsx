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

  const section = getReisSection(sectionKey);
  if (!section) {
    notFound();
  }

  // External sections are opened from the hub; keep a fallback redirect.
  if (section.external) {
    redirect(section.href);
  }

  // Defense calendar is external-only; any other key without a dedicated view yet
  // shows the placeholder until its reis-specific pages are built.
  if (sectionKey === "defense-calendar") {
    redirect(REIS_HOME_PATH);
  }

  return <ReisSectionPlaceholder section={section} />;
}
