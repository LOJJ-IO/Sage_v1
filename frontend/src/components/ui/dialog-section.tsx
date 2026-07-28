import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DialogSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DialogSection({
  title,
  description,
  children,
  className,
}: DialogSectionProps) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type DialogSectionGroupProps = {
  children: ReactNode;
  className?: string;
};

/** Tighter spacing for controls tied to a parent (pills → helper / textarea). */
export function DialogSectionGroup({
  children,
  className,
}: DialogSectionGroupProps) {
  return <div className={cn("space-y-3", className)}>{children}</div>;
}
