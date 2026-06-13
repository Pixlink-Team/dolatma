"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeader } from "@/components/public/section-header";
import { PosterCard } from "@/components/public/poster-card";
import type { MediaCategory, PosterWithVersions } from "@/lib/types";

interface PostersSectionProps {
  categories: MediaCategory[];
  posters: PosterWithVersions[];
}

export function PostersSection({ categories, posters }: PostersSectionProps) {
  const activeCategories = categories.filter((cat) =>
    posters.some((p) => p.categoryId === cat.id)
  );

  if (activeCategories.length === 0) return null;

  const defaultCategory = activeCategories[0]?.id ?? "all";

  return (
    <section id="posters">
      <SectionHeader
        title="پوسترها"
        description="پوسترهای کمپین — روی هر پوستر کلیک کنید و نسخه‌های قبلی را در کارت ببینید"
      />

      <Tabs defaultValue={defaultCategory}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {activeCategories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>{cat.title}</TabsTrigger>
          ))}
        </TabsList>

        {activeCategories.map((cat) => {
          const categoryPosters = posters.filter((p) => p.categoryId === cat.id);
          return (
            <TabsContent key={cat.id} value={cat.id}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryPosters.map((poster) => (
                  <PosterCard
                    key={poster.id}
                    title={poster.title}
                    description={poster.description}
                    versions={poster.versions}
                  />
                ))}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
