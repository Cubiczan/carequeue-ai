import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Assets from "./pages/Assets";
import Entities from "./pages/Entities";
import SupplyChain from "./pages/SupplyChain";
import Compliance from "./pages/Compliance";
import Events from "./pages/Events";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LayoutWrapper = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Index />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/entities" element={<Entities />} />
            <Route path="/supply-chain" element={<SupplyChain />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/events" element={<Events />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
