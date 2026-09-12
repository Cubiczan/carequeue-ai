import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const api = {
  async getBatches(params: any = {}) {
    const response = await fetch(`/api/carbon/batches?${new URLSearchParams(params)}`);
    const data = await response.json();
    return data.data || [];
  },
  async getTraceabilityChain(batchId: string) {
    const response = await fetch(`/api/carbon/batches/${batchId}/traceability`);
    const data = await response.json();
    return data.data || {};
  }
};

export default function Traceability() {
  const { batchId } = useParams<{ batchId: string }>();
  const [searchId, setSearchId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string | null>(batchId || null);

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['all-batches'],
    queryFn: () => api.getBatches({ limit: 50 })
  });

  const { data: traceability, isLoading: traceLoading } = useQuery({
    queryKey: ['traceability', selectedBatch],
    queryFn: () => selectedBatch ? api.getTraceabilityChain(selectedBatch) : null,
    enabled: !!selectedBatch
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedBatch(searchId);
  };

  const filteredBatches = batches.filter((b: any) => {
    if (!searchId) return true;
    const search = searchId.toLowerCase();
    return (
      b.batch_id?.toLowerCase().includes(search) ||
      b.id?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      received: 'badge-info',
      inspecting: 'badge-warning',
      in_process: 'badge-warning',
      completed: 'badge-success',
      on_hold: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Traceability</h1>
        <p className="text-gray-600 mt-1">Track batch genealogy and chain of custody</p>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Search batch ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            Trace Batch
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch List */}
        <div className="lg:col-span-1 card">
          <h2 className="text-xl font-semibold mb-4">All Batches</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredBatches.map((batch: any) => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedBatch === batch.id
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{batch.batch_id}</p>
                      <p className="text-xs text-gray-600">{batch.battery_type}</p>
                    </div>
                    <span className={`badge ${getStatusBadge(batch.status)}`}>
                      {batch.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Traceability Chain */}
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-semibold mb-4">Traceability Chain</h2>
          {traceLoading ? (
            <div className="text-center py-12 text-gray-500">Loading traceability data...</div>
          ) : !selectedBatch || !traceability ? (
            <div className="text-center py-12 text-gray-500">
              <p>Select a batch to view its traceability chain</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{traceability.batch_id}</h3>
                    <p className="text-sm text-gray-600">{traceability.battery_type}</p>
                  </div>
                  <span className={`badge ${getStatusBadge(traceability.status)}`}>
                    {traceability.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <p className="font-medium">{traceability.supplier || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Received:</span>
                    <p className="font-medium">
                      {traceability.receipt_date ? new Date(traceability.receipt_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Weight:</span>
                    <p className="font-medium">{traceability.weight_kg} kg</p>
                  </div>
                </div>
              </div>

              {/* Process Flow */}
              <div>
                <h4 className="font-medium mb-3">Process History</h4>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  <div className="space-y-4">
                    {/* Receipt */}
                    <div className="relative pl-12">
                      <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="font-medium text-blue-900">1. Battery Receipt</p>
                        <p className="text-sm text-blue-700">
                          {traceability.receipt_date ? new Date(traceability.receipt_date).toLocaleString() : 'N/A'}
                        </p>
                        {traceability.receipt_data && (
                          <p className="text-xs text-blue-600 mt-1">
                            Grade: {traceability.receipt_data.grade} | Condition: {traceability.receipt_data.condition}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inspection */}
                    <div className="relative pl-12">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                        traceability.inspection_date ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`rounded-lg p-3 ${
                        traceability.inspection_date ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <p className={`font-medium ${
                          traceability.inspection_date ? 'text-green-900' : 'text-gray-500'
                        }`}>
                          2. Technical Inspection
                        </p>
                        <p className={`text-sm ${
                          traceability.inspection_date ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {traceability.inspection_date 
                            ? new Date(traceability.inspection_date).toLocaleString()
                            : 'Pending'}
                        </p>
                        {traceability.inspection_data && (
                          <p className="text-xs text-green-600 mt-1">
                            Voltage: {traceability.inspection_data.voltage}V | 
                            Grade Assigned: {traceability.inspection_data.grade}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Disassembly */}
                    <div className="relative pl-12">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                        traceability.disassembly_date ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`rounded-lg p-3 ${
                        traceability.disassembly_date ? 'bg-yellow-50' : 'bg-gray-50'
                      }`}>
                        <p className={`font-medium ${
                          traceability.disassembly_date ? 'text-yellow-900' : 'text-gray-500'
                        }`}>
                          3. Disassembly
                        </p>
                        <p className={`text-sm ${
                          traceability.disassembly_date ? 'text-yellow-700' : 'text-gray-400'
                        }`}>
                          {traceability.disassembly_date 
                            ? new Date(traceability.disassembly_date).toLocaleString()
                            : 'Pending'}
                        </p>
                        {traceability.disassembly_data && (
                          <div className="text-xs text-yellow-600 mt-1 space-y-1">
                            <p>Modules: {traceability.disassembly_data.modules_kg} kg</p>
                            <p>Cells: {traceability.disassembly_data.cells_kg} kg</p>
                            <p>BMS: {traceability.disassembly_data.bms_count} units</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Material Recovery */}
                    <div className="relative pl-12">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                        traceability.recovery_date ? 'bg-purple-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`rounded-lg p-3 ${
                        traceability.recovery_date ? 'bg-purple-50' : 'bg-gray-50'
                      }`}>
                        <p className={`font-medium ${
                          traceability.recovery_date ? 'text-purple-900' : 'text-gray-500'
                        }`}>
                          4. Material Recovery
                        </p>
                        <p className={`text-sm ${
                          traceability.recovery_date ? 'text-purple-700' : 'text-gray-400'
                        }`}>
                          {traceability.recovery_date 
                            ? new Date(traceability.recovery_date).toLocaleString()
                            : 'Pending'}
                        </p>
                        {traceability.recovery_data && traceability.recovery_data.length > 0 && (
                          <div className="text-xs text-purple-600 mt-1 space-y-1">
                            {traceability.recovery_data.map((r: any, i: number) => (
                              <p key={i}>
                                {r.material}: {r.quantity_kg} kg ({r.purity}% purity)
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Completed */}
                    <div className="relative pl-12">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                        traceability.completed_date ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                      <div className={`rounded-lg p-3 ${
                        traceability.completed_date ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <p className={`font-medium ${
                          traceability.completed_date ? 'text-green-900' : 'text-gray-500'
                        }`}>
                          5. Completed
                        </p>
                        <p className={`text-sm ${
                          traceability.completed_date ? 'text-green-700' : 'text-gray-400'
                        }`}>
                          {traceability.completed_date 
                            ? new Date(traceability.completed_date).toLocaleString()
                            : 'In Progress'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mass Balance */}
              {traceability.mass_balance && (
                <div>
                  <h4 className="font-medium mb-3">Mass Balance</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Input Weight:</span>
                      <span className="font-medium">{traceability.mass_balance.input_kg} kg</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Recovered Materials:</span>
                      <span className="font-medium text-green-600">
                        {traceability.mass_balance.recovered_kg} kg
                      </span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Waste:</span>
                      <span className="font-medium text-red-600">
                        {traceability.mass_balance.waste_kg} kg
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Recovery Rate:</span>
                      <span className="font-medium text-green-600">
                        {traceability.mass_balance.recovery_rate}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
