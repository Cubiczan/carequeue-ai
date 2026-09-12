import { Package, Building2, ShieldCheck, Activity } from "lucide-react";

const stats = [
  {
    label: "Tracked Assets",
    value: "12,847",
    change: "+342 this week",
    icon: Package,
    trend: "up" as const,
  },
  {
    label: "Registered Entities",
    value: "156",
    change: "+8 this month",
    icon: Building2,
    trend: "up" as const,
  },
  {
    label: "Compliance Rate",
    value: "94.2%",
    change: "+1.3% vs last month",
    icon: ShieldCheck,
    trend: "up" as const,
  },
  {
    label: "On-Chain Events",
    value: "1.2M",
    change: "~3,400/day avg",
    icon: Activity,
    trend: "neutral" as const,
  },
];

const StatsGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="glass-panel p-4 animate-slide-in"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-semibold text-foreground mt-1 font-mono">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsGrid;
