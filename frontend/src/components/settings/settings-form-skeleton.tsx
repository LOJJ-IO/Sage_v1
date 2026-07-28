import { Skeleton } from "@/components/ui/skeleton";

export function SettingsFormSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-6"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}
