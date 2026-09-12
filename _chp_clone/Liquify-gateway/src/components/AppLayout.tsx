import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { connectWallet, formatAddress, isMetaMaskInstalled, subscribeToWallet, setupWalletListeners, getCurrentWalletState } from "@/lib/wallet";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setupWalletListeners();
    const unsubscribe = subscribeToWallet((state) => {
      setWalletAddress(state.address);
      setIsConnected(state.isConnected);
    });
    // Check initial state
    const currentState = getCurrentWalletState();
    if (currentState.isConnected) {
      setWalletAddress(currentState.address);
      setIsConnected(true);
    }
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search validators, positions..."
                  className="h-8 w-64 rounded-md bg-secondary border border-border pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button className="relative w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse-glow" />
              </button>
              <button
                onClick={handleConnect}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <Wallet className="w-3.5 h-3.5" />
                {isConnected && walletAddress ? formatAddress(walletAddress) : "Connect MetaMask"}
              </button>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
