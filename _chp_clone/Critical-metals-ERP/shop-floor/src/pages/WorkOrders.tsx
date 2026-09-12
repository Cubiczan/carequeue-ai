import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

const api = {
  async getWorkOrders(params: any = {}) {
    const response = await fetch(`/api/carbon/work-orders?${new URLSearchParams(params)}`);
    const data = await response.json();
    return data.data || [];
  }
};

export default function WorkOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['work-orders', statusFilter],
    queryFn: () => api.getWorkOrders(statusFilter !== 'all' ? { status: statusFilter } : {})
  });

  const filteredOrders = workOrders.filter((wo: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      wo.item?.toLowerCase().includes(search) ||
      wo.id?.toLowerCase().includes(search) ||
      wo.bom_no?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'badge-info',
      in_progress: 'badge-warning',
      completed: 'badge-success',
      stopped: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter((w: any) => w.status === 'pending').length,
    inProgress: workOrders.filter((w: any) => w.status === 'in_progress').length,
    completed: workOrders.filter((w: any) => w.status === 'completed').length
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
        <p className="text-gray-600 mt-1">Manage production work orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No work orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">BOM</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Workcenter</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Due Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((wo: any) => (
                  <tr key={wo.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{wo.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{wo.item}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{wo.qty}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{wo.bom_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{wo.workcenter || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusBadge(wo.status)}`}>
                        {wo.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {wo.planned_end_date ? new Date(wo.planned_end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
