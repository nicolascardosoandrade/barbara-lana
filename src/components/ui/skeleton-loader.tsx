import { Skeleton } from "@/components/ui/skeleton";

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <div className="w-full space-y-3">
    {/* Header */}
    <div className="flex gap-4 p-4 bg-muted/30 rounded-t-lg">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-4 border-b border-border/50">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 space-y-3">
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-3 w-1/2" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

export const CardGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export const ListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3 bg-card rounded-lg border border-border/50">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    ))}
  </div>
);

export const StatCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-card rounded-xl shadow-card border border-border/50 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    ))}
  </div>
);

export const CalendarSkeleton = () => (
  <div className="bg-card rounded-xl shadow-card border border-border/50 p-4">
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-16 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={`header-${i}`} className="h-8 w-full" />
      ))}
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={`cell-${i}`} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-4 p-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    ))}
    <div className="flex gap-3 pt-4">
      <Skeleton className="h-10 flex-1 rounded-md" />
      <Skeleton className="h-10 flex-1 rounded-md" />
    </div>
  </div>
);

export const PageHeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24 rounded-lg" />
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
  </div>
);
