import { Shield, Bell, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DashboardHeader = () => {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              Mineral Gateway
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Stellar · Soroban
            </p>
          </div>
          <Badge variant="stellar" className="ml-2 text-[10px]">TESTNET</Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search assets, entities..."
              className="h-8 w-64 rounded-md bg-secondary border border-border pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button className="relative w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
            <Bell className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse-glow" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
