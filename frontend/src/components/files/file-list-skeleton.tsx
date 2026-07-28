import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 5;

export function FileListSkeleton() {
  return (
    <ul aria-hidden="true" className="flex flex-col gap-0.5">
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <li
          key={index}
          className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1">
            <Skeleton className="size-5 shrink-0 rounded-md" />
            <Skeleton className="h-4 w-[min(100%,14rem)]" />
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}
