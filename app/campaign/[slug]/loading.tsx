import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignLoading() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-4 py-8">
        <section className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        </section>

        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-3 rounded-xl border bg-card/40 p-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-56 w-full" />
          </div>
        ))}
      </main>
    </div>
  );
}
