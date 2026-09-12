import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  subtext?: string;
  className?: string;
}

export function KpiCard({ label, value, trend, subtext, className }: KpiCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
      ? "text-rose-600"
      : "text-slate-500";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
        {subtext && (
          <div className={cn("mt-1 text-xs", trendColor)}>{subtext}</div>
        )}
      </CardContent>
    </Card>
  );
}
