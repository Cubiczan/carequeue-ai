import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const api = {
  async getPendingInspections() {
    const response = await fetch('/api/carbon/quality-inspections?status=pending');
    const data = await response.json();
    return data.data || [];
  },
  async createQualityInspection(data: any) {
    const response = await fetch('/api/carbon/quality-inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  async updateQualityInspection(id: string, data: any) {
    const response = await fetch(`/api/carbon/quality-inspections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

export default function QualityCheck() {
  const queryClient = useQueryClient();
  const [selectedInspection, setSelectedInspection] = useState<string | null>(null);
  const [inspectionForm, setInspectionForm] = useState({
    item_code: '',
    reference_type: 'Work Order',
    reference_name: '',
    inspection_type: 'In Process',
    sample_size: 1,
    readings: [] as any[]
  });

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['pending-inspections'],
    queryFn: api.getPendingInspections
  });

  const createMutation = useMutation({
    mutationFn: api.createQualityInspection,
    onSuccess: () => {
      toast.success('Quality inspection created successfully');
      queryClient.invalidateQueries({ queryKey: ['pending-inspections'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.updateQualityInspection(id, data),
    onSuccess: () => {
      toast.success('Quality inspection updated successfully');
      queryClient.invalidateQueries({ queryKey: ['pending-inspections'] });
      resetForm();
    }
  });

  const resetForm = () => {
    setSelectedInspection(null);
    setInspectionForm({
      item_code: '',
      reference_type: 'Work Order',
      reference_name: '',
      inspection_type: 'In Process',
      sample_size: 1,
      readings: []
    });
  };

  const addReading = () => {
    setInspectionForm({
      ...inspectionForm,
      readings: [...inspectionForm.readings, { specification: '', status: 'Pass', value: '' }]
    });
  };

  const updateReading = (index: number, field: string, value: string) => {
    const newReadings = [...inspectionForm.readings];
    newReadings[index] = { ...newReadings[index], [field]: value };
    setInspectionForm({ ...inspectionForm, readings: newReadings });
  };

  const removeReading = (index: number) => {
    const newReadings = inspectionForm.readings.filter((_, i) => i !== index);
    setInspectionForm({ ...inspectionForm, readings: newReadings });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...inspectionForm,
      inspection_date: new Date().toISOString()
    };

    if (selectedInspection) {
      updateMutation.mutate({ id: selectedInspection, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const selectInspection = (inspection: any) => {
    setSelectedInspection(inspection.id);
    setInspectionForm({
      item_code: inspection.item_code || '',
      reference_type: inspection.reference_type || 'Work Order',
      reference_name: inspection.reference_name || '',
      inspection_type: inspection.inspection_type || 'In Process',
      sample_size: inspection.sample_size || 1,
      readings: inspection.readings || []
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quality Check</h1>
        <p className="text-gray-600 mt-1">Record quality inspections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Inspections List */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Pending Inspections</h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No pending inspections</p>
              <p className="text-sm mt-2">Create a new inspection using the form</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inspections.map((inspection: any) => (
                <button
                  key={inspection.id}
                  onClick={() => selectInspection(inspection)}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    selectedInspection === inspection.id
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{inspection.item_code}</p>
                      <p className="text-sm text-gray-600">
                        {inspection.reference_type}: {inspection.reference_name}
                      </p>
                    </div>
                    <span className="badge badge-warning">Pending</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inspection Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            {selectedInspection ? 'Edit Inspection' : 'New Inspection'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Item Code</label>
              <input
                type="text"
                className="input"
                value={inspectionForm.item_code}
                onChange={(e) => setInspectionForm({ ...inspectionForm, item_code: e.target.value })}
                placeholder="e.g., COB-001"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Reference Type</label>
                <select
                  className="input"
                  value={inspectionForm.reference_type}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, reference_type: e.target.value })}
                >
                  <option value="Work Order">Work Order</option>
                  <option value="Batch">Batch</option>
                  <option value="Purchase Receipt">Purchase Receipt</option>
                </select>
              </div>
              <div>
                <label className="label">Reference Name</label>
                <input
                  type="text"
                  className="input"
                  value={inspectionForm.reference_name}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, reference_name: e.target.value })}
                  placeholder="WO-001 or BATCH-001"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Inspection Type</label>
                <select
                  className="input"
                  value={inspectionForm.inspection_type}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_type: e.target.value })}
                >
                  <option value="Incoming">Incoming</option>
                  <option value="In Process">In Process</option>
                  <option value="Final">Final</option>
                </select>
              </div>
              <div>
                <label className="label">Sample Size</label>
                <input
                  type="number"
                  className="input"
                  value={inspectionForm.sample_size}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, sample_size: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            {/* Readings */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label">Inspection Readings</label>
                <button
                  type="button"
                  onClick={addReading}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  + Add Reading
                </button>
              </div>
              
              {inspectionForm.readings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No readings added</p>
              ) : (
                <div className="space-y-2">
                  {inspectionForm.readings.map((reading, index) => (
                    <div key={index} className="flex gap-2 items-start bg-gray-50 p-2 rounded">
                      <input
                        type="text"
                        className="input flex-1 text-sm"
                        placeholder="Specification"
                        value={reading.specification}
                        onChange={(e) => updateReading(index, 'specification', e.target.value)}
                      />
                      <input
                        type="text"
                        className="input w-24 text-sm"
                        placeholder="Value"
                        value={reading.value}
                        onChange={(e) => updateReading(index, 'value', e.target.value)}
                      />
                      <select
                        className="input w-24 text-sm"
                        value={reading.status}
                        onChange={(e) => updateReading(index, 'status', e.target.value)}
                      >
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeReading(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="btn-primary flex-1">
                {selectedInspection ? 'Update Inspection' : 'Submit Inspection'}
              </button>
              {selectedInspection && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
