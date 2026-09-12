import { Droplets, Users, TrendingUp, Server } from "lucide-react";

const stats = [
  {
    label: "Total Value Locked",
    value: "2,156,000",
    change: "+180,000 this week",
    icon: Droplets,
    trend: "up" as const,
  },
  {
    label: "Active Stakers",
    value: "84,620",
    change: "+2,340 this month",
    icon: Users,
    trend: "up" as const,
  },
  {
    label: "Network APR",
    value: "5.12%",
    change: "+0.08% vs last epoch",
    icon: TrendingUp,
    trend: "up" as const,
  },
  {
    label: "Active Validators",
    value: "41/42",
    change: "1 jailed",
    icon: Server,
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
