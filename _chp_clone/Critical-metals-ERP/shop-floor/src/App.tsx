import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetail from './pages/WorkOrderDetail';
import BatteryReceipt from './pages/BatteryReceipt';
import QualityCheck from './pages/QualityCheck';
import MaterialRecovery from './pages/MaterialRecovery';
import Traceability from './pages/Traceability';
import Settings from './pages/Settings';
import HazardousWaste from './pages/HazardousWaste';
import Inventory from './pages/Inventory';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 30000, // 30 seconds
      retry: 2
    }
  }
});

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
            <Route path="/work-orders/:id" element={<ProtectedRoute><WorkOrderDetail /></ProtectedRoute>} />
            <Route path="/battery-receipt" element={<ProtectedRoute><BatteryReceipt /></ProtectedRoute>} />
            <Route path="/quality-check" element={<ProtectedRoute><QualityCheck /></ProtectedRoute>} />
            <Route path="/material-recovery" element={<ProtectedRoute><MaterialRecovery /></ProtectedRoute>} />
            <Route path="/traceability" element={<ProtectedRoute><Traceability /></ProtectedRoute>} />
            <Route path="/traceability/:batchId" element={<ProtectedRoute><Traceability /></ProtectedRoute>} />
            <Route path="/hazardous-waste" element={<ProtectedRoute><HazardousWaste /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
