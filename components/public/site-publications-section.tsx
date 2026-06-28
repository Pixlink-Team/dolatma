import Image from "next/image";
import { ExternalLink, Globe } from "lucide-react";
import type { DataOwnerGroup, SocialMediaPost } from "@/lib/types";
import { formatPersianDate } from "@/lib/utils";
import { CollapsibleSection } from "@/components/public/collapsible-section";
import { OwnerGroupedSection } from "@/components/public/owner-grouped-section";
import { Badge } from "@/components/ui/badge";

interface SitePublicationsSectionProps {
  publications: SocialMediaPost[];
  groups: DataOwnerGroup<SocialMediaPost>[];
}

function PublicationList({ items }: { items: SocialMediaPost[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4"
        >
          {item.coverImageUrl && (
            <div className="relative w-full sm:w-40 h-28 shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image
                src={item.coverImageUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          )}

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Globe className="h-3.5 w-3.5" />
                منتشرشده در سایت
              </Badge>
              <span className="text-sm text-muted-foreground">{formatPersianDate(item.publishedDate)}</span>
            </div>

            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1.5 break-words"
              >
                {item.title}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            ) : (
              <h3 className="font-semibold">{item.title}</h3>
            )}

            {item.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function SitePublicationsSection({ publications, groups }: SitePublicationsSectionProps) {
  if (publications.length === 0) return null;

  return (
    <CollapsibleSection
      id="site-publications"
      title="انتشار در سایت"
      description="مطالب منتشرشده در سایت کمپین — عنوان هر مورد لینک مستقیم به صفحه است"
    >
      <OwnerGroupedSection groups={groups}>
        {(groupItems) => <PublicationList items={groupItems} />}
      </OwnerGroupedSection>
    </CollapsibleSection>
  );
}
