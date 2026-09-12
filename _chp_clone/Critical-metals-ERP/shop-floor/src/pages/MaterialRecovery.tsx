import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const api = {
  async getBatches(params: any = {}) {
    const response = await fetch(`/api/carbon/batches?${new URLSearchParams(params)}`);
    const data = await response.json();
    return data.data || [];
  },
  async recordMaterialRecovery(data: any) {
    const response = await fetch('/api/carbon/material-consumption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

export default function MaterialRecovery() {
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [recoveryForm, setRecoveryForm] = useState({
    batch_reference: '',
    process_stage: 'shredding',
    material_type: '',
    quantity_kg: 0,
    purity_percent: 99,
    target_warehouse: 'Recovered Materials'
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches-in-process'],
    queryFn: () => api.getBatches({ status: 'in_process' })
  });

  const recoveryMutation = useMutation({
    mutationFn: api.recordMaterialRecovery,
    onSuccess: () => {
      toast.success('Material recovery recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['batches-in-process'] });
      setRecoveryForm({
        batch_reference: '',
        process_stage: 'shredding',
        material_type: '',
        quantity_kg: 0,
        purity_percent: 99,
        target_warehouse: 'Recovered Materials'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recoveryMutation.mutate({
      ...recoveryForm,
      recorded_at: new Date().toISOString()
    });
  };

  const processStages = [
    { value: 'shredding', label: 'Shredding' },
    { value: 'physical_separation', label: 'Physical Separation' },
    { value: 'hydrometallurgy', label: 'Hydrometallurgy' },
    { value: 'refining', label: 'Refining' }
  ];

  const materialTypes = [
    { value: 'Cobalt Sulfate', label: 'Cobalt Sulfate (CoSO₄)' },
    { value: 'Nickel Sulfate', label: 'Nickel Sulfate (NiSO₄)' },
    { value: 'Lithium Carbonate', label: 'Lithium Carbonate (Li₂CO₃)' },
    { value: 'Manganese Carbonate', label: 'Manganese Carbonate (MnCO₃)' },
    { value: 'Copper', label: 'Copper (Cu)' },
    { value: 'Aluminum', label: 'Aluminum (Al)' },
    { value: 'Steel', label: 'Steel/Iron' },
    { value: 'Plastic', label: 'Plastics' }
  ];

  const warehouses = [
    'Recovered Materials',
    'Finished Goods',
    'Hazardous Waste',
    'By-products Storage'
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Material Recovery</h1>
        <p className="text-gray-600 mt-1">Track recovered materials from recycling process</p>
      </div>

      {/* Recovery Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-600">Batches in Process</p>
          <p className="text-2xl font-bold text-blue-600">{batches.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Today's Recovery</p>
          <p className="text-2xl font-bold text-green-600">0 kg</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Avg Purity</p>
          <p className="text-2xl font-bold text-purple-600">99.2%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-600">Recovery Rate</p>
          <p className="text-2xl font-bold text-orange-600">94.5%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batches in Process */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Batches in Process</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No batches currently in process</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {batches.map((batch: any) => (
                <button
                  key={batch.id}
                  onClick={() => {
                    setSelectedBatch(batch.id);
                    setRecoveryForm({ ...recoveryForm, batch_reference: batch.id });
                  }}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    selectedBatch === batch.id
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{batch.batch_id}</p>
                      <p className="text-sm text-gray-600">
                        {batch.material_type} | {batch.current_stage || 'Processing'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Input: {batch.input_weight_kg}kg
                      </p>
                    </div>
                    <span className="badge badge-warning">In Process</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Record Recovery Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Record Material Recovery</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Batch Reference</label>
              <input
                type="text"
                className="input"
                value={recoveryForm.batch_reference}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, batch_reference: e.target.value })}
                placeholder="Select from list or enter batch ID"
                required
              />
            </div>

            <div>
              <label className="label">Process Stage</label>
              <select
                className="input"
                value={recoveryForm.process_stage}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, process_stage: e.target.value })}
              >
                {processStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Material Type</label>
              <select
                className="input"
                value={recoveryForm.material_type}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, material_type: e.target.value })}
                required
              >
                <option value="">Select material...</option>
                {materialTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity Recovered (kg)</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  value={recoveryForm.quantity_kg}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, quantity_kg: parseFloat(e.target.value) || 0 })}
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="label">Purity (%)</label>
                <input
                  type="number"
                  className="input"
                  step="0.1"
                  value={recoveryForm.purity_percent}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, purity_percent: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label className="label">Target Warehouse</label>
              <select
                className="input"
                value={recoveryForm.target_warehouse}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, target_warehouse: e.target.value })}
              >
                {warehouses.map((wh) => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                className="btn-primary flex-1"
                disabled={recoveryMutation.isPending}
              >
                {recoveryMutation.isPending ? 'Recording...' : 'Record Recovery'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
