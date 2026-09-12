import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import {
  ArchiveBoxIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ExclamationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'levels' | 'transfers' | 'alerts'>('levels');
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory-levels', selectedWarehouse],
    queryFn: () => api.get(`/api/inventory/levels${selectedWarehouse !== 'all' ? `?warehouse=${selectedWarehouse}` : ''}`)
  });

  const { data: alerts } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => api.get('/api/inventory/alerts')
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/api/inventory/warehouses')
  });

  const transferMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/inventory/transfers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      toast.success('Transfer completed successfully');
      setShowTransfer(false);
    }
  });

  const lowStockCount = alerts?.data?.alerts?.length || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1">Track stock levels and transfers</p>
          </div>
          <button
            onClick={() => setShowTransfer(true)}
            className="btn-primary flex items-center gap-2"
          >
            <ArrowRightIcon className="w-5 h-5" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold">{inventory?.data?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Warehouses</p>
              <p className="text-2xl font-bold">{warehouses?.data?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ExclamationCircleIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Stock Value</p>
              <p className="text-2xl font-bold">$0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {lowStockCount > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                {lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}
              </h3>
              <div className="mt-2 space-y-1">
                {alerts?.data?.alerts?.slice(0, 3).map((alert: any, i: number) => (
                  <p key={i} className="text-sm text-yellow-700">
                    <span className="font-medium">{alert.item_name}</span> at {alert.warehouse}: 
                    {alert.current_quantity} {alert.unit} (reorder at {alert.reorder_point})
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {[
            { id: 'levels', label: 'Stock Levels' },
            { id: 'transfers', label: 'Transfers' },
            { id: 'alerts', label: 'Alerts', count: lowStockCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'levels' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Stock Levels by Warehouse</h2>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="input w-48"
            >
              <option value="all">All Warehouses</option>
              {warehouses?.data?.map((wh: any) => (
                <option key={wh.code} value={wh.code}>{wh.name}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item Code</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Item Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Warehouse</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory?.data?.map((level: any) => (
                    <tr key={`${level.item_code}-${level.warehouse}`} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{level.item_code}</td>
                      <td className="px-4 py-3 text-sm">{level.item_name}</td>
                      <td className="px-4 py-3 text-sm">{level.warehouse}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={level.is_low ? 'text-red-600 font-medium' : ''}>
                          {level.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{level.unit}</td>
                      <td className="px-4 py-3">
                        {level.is_low ? (
                          <span className="badge badge-danger">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Stock Alerts</h2>
          {lowStockCount === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>All stock levels are adequate</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts?.data?.alerts.map((alert: any, i: number) => (
                <div key={i} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-yellow-900">{alert.item_name}</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Current: {alert.current_quantity} {alert.unit} | 
                        Reorder Point: {alert.reorder_point} {alert.unit} | 
                        Warehouse: {alert.warehouse}
                      </p>
                    </div>
                    <span className={`badge ${alert.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                      {alert.severity === 'high' ? 'Critical' : 'Warning'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Stock Transfer</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  transferMutation.mutate({
                    item_code: formData.get('item_code'),
                    from_warehouse: formData.get('from_warehouse'),
                    to_warehouse: formData.get('to_warehouse'),
                    quantity: parseFloat(formData.get('quantity') as string)
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">Item</label>
                  <select name="item_code" className="input" required>
                    <option value="">Select item...</option>
                    {inventory?.data?.map((level: any) => (
                      <option key={level.item_code} value={level.item_code}>
                        {level.item_code} - {level.item_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">From Warehouse</label>
                  <select name="from_warehouse" className="input" required>
                    <option value="">Select source...</option>
                    {warehouses?.data?.map((wh: any) => (
                      <option key={wh.code} value={wh.code}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">To Warehouse</label>
                  <select name="to_warehouse" className="input" required>
                    <option value="">Select destination...</option>
                    {warehouses?.data?.map((wh: any) => (
                      <option key={wh.code} value={wh.code}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input name="quantity" type="number" step="0.01" className="input" required />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    Transfer Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransfer(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
