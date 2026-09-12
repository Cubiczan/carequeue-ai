import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const api = {
  async getWorkOrder(id: string) {
    const response = await fetch(`/api/carbon/work-orders/${id}`);
    const data = await response.json();
    return data.data;
  },
  async updateWorkOrderStatus(id: string, status: string, data: any = {}) {
    const response = await fetch(`/api/carbon/work-orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...data })
    });
    return response.json();
  },
  async completeWorkOrder(id: string, data: any) {
    const response = await fetch(`/api/carbon/work-orders/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  async recordMaterialConsumption(data: any) {
    const response = await fetch('/api/carbon/material-consumption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionData, setCompletionData] = useState({
    actual_qty: 0,
    scrap_qty: 0,
    notes: ''
  });

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => id ? api.getWorkOrder(id) : null,
    enabled: !!id
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, data }: { status: string; data?: any }) => 
      id ? api.updateWorkOrderStatus(id, status, data) : null,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      toast.success('Status updated successfully');
    }
  });

  const completeMutation = useMutation({
    mutationFn: (data: any) => id ? api.completeWorkOrder(id, data) : null,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      toast.success('Work order completed successfully');
      setShowCompleteModal(false);
      navigate('/work-orders');
    }
  });

  const handleStart = () => {
    statusMutation.mutate({ status: 'in_progress', data: { started_at: new Date().toISOString() } });
  };

  const handleStop = () => {
    const reason = prompt('Reason for stopping:');
    if (reason) {
      statusMutation.mutate({ status: 'stopped', data: { stop_reason: reason } });
    }
  };

  const handleComplete = () => {
    setShowCompleteModal(true);
  };

  const submitCompletion = () => {
    completeMutation.mutate({
      ...completionData,
      completed_at: new Date().toISOString()
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">Loading...</div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6 text-center text-gray-500">Work order not found</div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/work-orders')}
          className="text-green-600 hover:text-green-800 mb-4"
        >
          ← Back to Work Orders
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Work Order {workOrder.id}</h1>
            <p className="text-gray-600 mt-1">{workOrder.item}</p>
          </div>
          <span className={`badge ${workOrder.status === 'completed' ? 'badge-success' : workOrder.status === 'in_progress' ? 'badge-warning' : 'badge-info'}`}>
            {workOrder.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Work Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Quantity</h3>
          <p className="text-2xl font-bold">{workOrder.qty} units</p>
          <p className="text-sm text-gray-500 mt-1">Planned: {workOrder.qty_to_manufacture}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">BOM</h3>
          <p className="text-lg font-medium">{workOrder.bom_no || 'N/A'}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Workcenter</h3>
          <p className="text-lg font-medium">{workOrder.workcenter || 'N/A'}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Planned Start</h3>
          <p className="text-lg">
            {workOrder.planned_start_date ? new Date(workOrder.planned_start_date).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Planned End</h3>
          <p className="text-lg">
            {workOrder.planned_end_date ? new Date(workOrder.planned_end_date).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Project</h3>
          <p className="text-lg">{workOrder.project || 'N/A'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex gap-4">
          {workOrder.status === 'pending' && (
            <button onClick={handleStart} className="btn-primary">
              Start Work Order
            </button>
          )}
          {workOrder.status === 'in_progress' && (
            <>
              <button onClick={handleComplete} className="btn-primary">
                Complete Work Order
              </button>
              <button onClick={handleStop} className="btn-danger">
                Stop Work Order
              </button>
            </>
          )}
          {workOrder.status === 'stopped' && (
            <button 
              onClick={() => statusMutation.mutate({ status: 'in_progress' })}
              className="btn-primary"
            >
              Resume Work Order
            </button>
          )}
        </div>
      </div>

      {/* Materials Section */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold mb-4">Materials</h3>
        {workOrder.materials && workOrder.materials.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Material</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Required</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Consumed</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Unit</th>
              </tr>
            </thead>
            <tbody>
              {workOrder.materials.map((mat: any, idx: number) => (
                <tr key={idx} className="border-b">
                  <td className="px-4 py-3 text-sm">{mat.item_code}</td>
                  <td className="px-4 py-3 text-sm">{mat.required_qty}</td>
                  <td className="px-4 py-3 text-sm">{mat.consumed_qty || 0}</td>
                  <td className="px-4 py-3 text-sm">{mat.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No materials listed</p>
        )}
      </div>

      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Complete Work Order</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Actual Quantity Produced</label>
                <input
                  type="number"
                  className="input"
                  value={completionData.actual_qty}
                  onChange={(e) => setCompletionData({ ...completionData, actual_qty: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="label">Scrap Quantity</label>
                <input
                  type="number"
                  className="input"
                  value={completionData.scrap_qty}
                  onChange={(e) => setCompletionData({ ...completionData, scrap_qty: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input h-24"
                  value={completionData.notes}
                  onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                  placeholder="Any comments about this production run..."
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={submitCompletion} className="btn-primary flex-1">
                Confirm Completion
              </button>
              <button 
                onClick={() => setShowCompleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
