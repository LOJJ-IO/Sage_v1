import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 4;

export function AccountsTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block"
    >
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: ROW_COUNT }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
