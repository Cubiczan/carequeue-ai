import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800",
        pending: "bg-amber-100 text-amber-800",
        approved: "bg-emerald-100 text-emerald-800",
        rejected: "bg-rose-100 text-rose-800",
        idle: "bg-slate-200 text-slate-700",
        reviewing: "bg-blue-100 text-blue-800",
        approving: "bg-emerald-100 text-emerald-800",
        rejecting: "bg-rose-100 text-rose-800",
        filtering: "bg-yellow-100 text-yellow-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
