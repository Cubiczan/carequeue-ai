import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  BeakerIcon,
  TruckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// API calls
const apiCalls = {
  async getDashboardStats() {
    const response = await api.get('/api/carbon/analytics/production');
    return response;
  },
  async getActiveWorkOrders() {
    const response = await api.get('/api/carbon/work-orders?status=in_progress');
    return response;
  },
  async getPendingQualityChecks() {
    const response = await api.get('/api/carbon/quality-inspections?status=pending');
    return response;
  },
  async getRecentBatches() {
    const response = await api.get('/api/carbon/batches?limit=10');
    return response;
  }
};

export default function Dashboard() {
  const { user, hasPermission } = useAuth();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getDashboardStats
  });

  const { data: workOrders, isLoading: woLoading } = useQuery({
    queryKey: ['active-work-orders'],
    queryFn: api.getActiveWorkOrders
  });

  const { data: qualityChecks, isLoading: qcLoading } = useQuery({
    queryKey: ['pending-quality-checks'],
    queryFn: api.getPendingQualityChecks
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['recent-batches'],
    queryFn: api.getRecentBatches
  });

  const quickActions = [
    {
      title: 'New Battery Receipt',
      icon: TruckIcon,
      link: '/battery-receipt',
      color: 'bg-blue-500'
    },
    {
      title: 'Quality Check',
      icon: BeakerIcon,
      link: '/quality-check',
      color: 'bg-green-500'
    },
    {
      title: 'Work Orders',
      icon: ClipboardDocumentListIcon,
      link: '/work-orders',
      color: 'bg-purple-500'
    },
    {
      title: 'Material Recovery',
      icon: ClipboardDocumentCheckIcon,
      link: '/material-recovery',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shop Floor Dashboard</h1>
        <p className="text-gray-600 mt-1">Battery Recycling Operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Work Orders"
          value={workOrders?.data?.length || 0}
          icon={ClipboardDocumentListIcon}
          color="blue"
          loading={woLoading}
        />
        <StatCard
          title="Pending Quality Checks"
          value={qualityChecks?.data?.length || 0}
          icon={BeakerIcon}
          color="green"
          loading={qcLoading}
        />
        <StatCard
          title="Batches in Process"
          value={batches?.data?.filter((b: any) => b.status === 'in_process')?.length || 0}
          icon={ChartBarIcon}
          color="purple"
          loading={batchesLoading}
        />
        <StatCard
          title="Alerts"
          value={stats?.data?.alerts || 0}
          icon={ExclamationTriangleIcon}
          color="red"
          loading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className={`${action.color} text-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
            >
              <action.icon className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg">{action.title}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Active Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Work Orders</h2>
          {woLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-3">
              {workOrders?.data?.slice(0, 5).map((wo: any) => (
                <Link
                  key={wo.id}
                  to={`/work-orders/${wo.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{wo.item}</h3>
                      <p className="text-sm text-gray-600">Qty: {wo.qty} | Status: {wo.status}</p>
                    </div>
                    <span className="text-xs text-gray-500">{wo.id}</span>
                  </div>
                </Link>
              ))}
              {workOrders?.data?.length === 0 && (
                <p className="text-center text-gray-500 py-4">No active work orders</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Batches */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Batches</h2>
          {batchesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-3">
              {batches?.data?.slice(0, 5).map((batch: any) => (
                <Link
                  key={batch.id}
                  to={`/traceability/${batch.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{batch.batch_id}</h3>
                      <p className="text-sm text-gray-600">{batch.battery_type} | {batch.status}</p>
                    </div>
                    <span className="text-xs text-gray-500">{batch.created_at}</span>
                  </div>
                </Link>
              ))}
              {batches?.data?.length === 0 && (
                <p className="text-center text-gray-500 py-4">No recent batches</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Quality Checks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Quality Checks</h2>
        {qcLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {qualityChecks?.data?.slice(0, 5).map((qc: any) => (
              <Link
                key={qc.id}
                to={`/quality-check?id=${qc.id}`}
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{qc.item_code}</h3>
                    <p className="text-sm text-gray-600">
                      {qc.inspection_type} | {qc.reference_name}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Pending
                  </span>
                </div>
              </Link>
            ))}
            {qualityChecks?.data?.length === 0 && (
              <p className="text-center text-gray-500 py-4">No pending quality checks</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, loading }: any) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );
}
