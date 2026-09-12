import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import BarcodeScanner from '../components/BarcodeScanner';
import BarcodeLabelPrinter from '../components/BarcodeLabelPrinter';
import { QrCodeIcon, PrinterIcon } from '@heroicons/react/24/outline';

const apiCalls = {
  async createBatteryReceipt(data: any) {
    const response = await api.post('/api/carbon/batches', data);
    return response;
  },
  async generateBatchId(existingBatches?: any[]) {
    const response = await api.post('/api/barcode/generate-batch-id', { existingBatches });
    return response;
  }
};

export default function BatteryReceipt() {
  const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);
  const [showLabelPrinter, setShowLabelPrinter] = useState(false);
  const [generatedBatchId, setGeneratedBatchId] = useState('');
  const [formData, setFormData] = useState({
    supplier: '',
    supplier_batch_id: '',
    battery_type: 'Li-ion',
    quantity: 0,
    weight_kg: 0,
    pack_configuration: '',
    voltage_avg: 0,
    condition: 'good',
    notes: ''
  });

  const mutation = useMutation({
    mutationFn: apiCalls.createBatteryReceipt,
    onSuccess: (data: any) => {
      toast.success('Battery receipt created successfully!');
      queryClient.invalidateQueries({ queryKey: ['recent-batches'] });
      
      // Generate batch ID and show label printer
      if (data.data?.batch_id) {
        setGeneratedBatchId(data.data.batch_id);
        setShowLabelPrinter(true);
      }
      
      setFormData({
        supplier: '',
        supplier_batch_id: '',
        battery_type: 'Li-ion',
        quantity: 0,
        weight_kg: 0,
        pack_configuration: '',
        voltage_avg: 0,
        condition: 'good',
        notes: ''
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create receipt: ${error.message}`);
    }
  });

  const handleGenerateBatchId = async () => {
    try {
      const result = await apiCalls.generateBatchId();
      if (result.success && result.data?.batch_id) {
        setGeneratedBatchId(result.data.batch_id);
        toast.success(`Generated batch ID: ${result.data.batch_id}`);
      }
    } catch (error: any) {
      toast.error(`Failed to generate batch ID: ${error.message}`);
    }
  };

  const handleScanSuccess = async (scannedCode: string) => {
    setShowScanner(false);
    
    // Try to validate the scanned code
    try {
      const response = await api.post('/api/barcode/validate', {
        code: scannedCode,
        type: scannedCode.startsWith('{') ? 'qr_code' : 'batch_id'
      });
      
      if (response.success && response.data?.valid) {
        const batchData = response.data.data || response.data.batch;
        if (batchData) {
          // Pre-fill form with scanned data
          setFormData({
            ...formData,
            supplier_batch_id: batchData.id || scannedCode,
            supplier: batchData.supplier || formData.supplier,
            battery_type: batchData.battery_type || formData.battery_type
          });
          toast.success('Barcode scanned and decoded successfully!');
        }
      } else {
        // Just use as supplier batch ID
        setFormData({
          ...formData,
          supplier_batch_id: scannedCode
        });
        toast.success('Scanned code entered as supplier batch ID');
      }
    } catch (error: any) {
      setFormData({
        ...formData,
        supplier_batch_id: scannedCode
      });
      toast.success('Scanned code entered');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const batteryTypes = [
    { value: 'Li-ion', label: 'Lithium-Ion (Li-ion)' },
    { value: 'LiFePO4', label: 'Lithium Iron Phosphate (LiFePO4)' },
    { value: 'NMC', label: 'Nickel Manganese Cobalt (NMC)' },
    { value: 'NCA', label: 'Nickel Cobalt Aluminum (NCA)' },
    { value: 'NiMH', label: 'Nickel Metal Hydride (NiMH)' },
    { value: 'Lead-acid', label: 'Lead-Acid' }
  ];

  const conditions = [
    { value: 'excellent', label: 'Excellent - No damage' },
    { value: 'good', label: 'Good - Minor wear' },
    { value: 'fair', label: 'Fair - Some damage' },
    { value: 'poor', label: 'Poor - Significant damage' },
    { value: 'hazardous', label: 'Hazardous - Leaking/swollen' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Battery Receipt</h1>
        <p className="text-gray-600 mt-1">Record inbound battery shipment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Supplier Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier</label>
              <input
                type="text"
                className="input"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
                required
              />
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>Supplier Batch ID</span>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm"
                >
                  <QrCodeIcon className="w-4 h-4" />
                  Scan
                </button>
              </label>
              <input
                type="text"
                className="input"
                value={formData.supplier_batch_id}
                onChange={(e) => setFormData({ ...formData, supplier_batch_id: e.target.value })}
                placeholder="Batch ID from supplier"
                required
              />
            </div>
          </div>
        </div>

        {/* Battery Details */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Battery Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Battery Type</label>
              <select
                className="input"
                value={formData.battery_type}
                onChange={(e) => setFormData({ ...formData, battery_type: e.target.value })}
              >
                {batteryTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Pack Configuration</label>
              <input
                type="text"
                className="input"
                value={formData.pack_configuration}
                onChange={(e) => setFormData({ ...formData, pack_configuration: e.target.value })}
                placeholder="e.g., 96S30P"
              />
            </div>
            <div>
              <label className="label">Quantity (units)</label>
              <input
                type="number"
                className="input"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                min="0"
                required
              />
            </div>
            <div>
              <label className="label">Total Weight (kg)</label>
              <input
                type="number"
                className="input"
                step="0.01"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0 })}
                min="0"
                required
              />
            </div>
            <div>
              <label className="label">Average Voltage (V)</label>
              <input
                type="number"
                className="input"
                step="0.1"
                value={formData.voltage_avg}
                onChange={(e) => setFormData({ ...formData, voltage_avg: parseFloat(e.target.value) || 0 })}
                min="0"
                max="60"
              />
            </div>
            <div>
              <label className="label">Condition</label>
              <select
                className="input"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                {conditions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
          <textarea
            className="input h-24"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special handling instructions, damage notes, etc."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn-primary flex items-center gap-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <PrinterIcon className="w-5 h-5" />
                Create Receipt & Print Labels
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleGenerateBatchId}
            className="btn-secondary"
          >
            Generate Batch ID
          </button>
          <button
            type="button"
            onClick={() => setFormData({
              supplier: '',
              supplier_batch_id: '',
              battery_type: 'Li-ion',
              quantity: 0,
              weight_kg: 0,
              pack_configuration: '',
              voltage_avg: 0,
              condition: 'good',
              notes: ''
            })}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScanSuccess}
          onError={(error) => toast.error(`Scan error: ${error}`)}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Label Printer Modal */}
      {showLabelPrinter && generatedBatchId && (
        <BarcodeLabelPrinter
          batch={{
            batch_id: generatedBatchId,
            battery_type: formData.battery_type,
            supplier: formData.supplier,
            weight_kg: formData.weight_kg,
            receipt_date: new Date().toISOString(),
            grade: 'A' // Would come from inspection
          }}
          onClose={() => {
            setShowLabelPrinter(false);
            setGeneratedBatchId('');
          }}
        />
      )}
    </div>
  );
}
