import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import Barcode from 'react-barcode';
import { PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface BarcodeLabelProps {
  batch: {
    batch_id: string;
    battery_type: string;
    supplier: string;
    weight_kg: number;
    receipt_date: string;
    grade?: string;
  };
  onClose: () => void;
}

export default function BarcodeLabelPrinter({ batch, onClose }: BarcodeLabelProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [quantity, setQuantity] = useState(1);

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Label-${batch.batch_id}`,
    onAfterPrint: () => {
      // Could trigger multiple prints based on quantity
      if (quantity > 1) {
        // For now, just notify - browser will handle multiple prints
        console.log(`Printed ${quantity} labels`);
      }
    }
  });

  const sizeClasses = {
    small: 'w-48 h-32',
    medium: 'w-64 h-48',
    large: 'w-80 h-64'
  };

  const getGradeColor = (grade?: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-lime-500',
      'C': 'bg-amber-500',
      'D': 'bg-orange-500',
      'SCRAP': 'bg-red-500'
    };
    return colors[grade || ''] || 'bg-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Print Barcode Label</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div>
              <label className="label">Label Size</label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setLabelSize(size)}
                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors capitalize ${
                      labelSize === size
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Number of Labels</label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="input"
              />
            </div>

            <div className="pt-4">
              <button
                onClick={handlePrint}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <PrinterIcon className="w-5 h-5" />
                Print Labels
              </button>
            </div>

            {/* Batch Info Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Batch Information:</h3>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Batch ID:</dt>
                  <dd className="font-medium">{batch.batch_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Type:</dt>
                  <dd>{batch.battery_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Supplier:</dt>
                  <dd>{batch.supplier}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Weight:</dt>
                  <dd>{batch.weight_kg} kg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Received:</dt>
                  <dd>{new Date(batch.receipt_date).toLocaleDateString()}</dd>
                </div>
                {batch.grade && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Grade:</dt>
                    <dd className={`px-2 py-0.5 rounded text-xs text-white ${getGradeColor(batch.grade)}`}>
                      {batch.grade}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Label Preview */}
          <div className="flex items-center justify-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <p className="text-center text-sm text-gray-500 mb-4">Preview</p>
              
              {/* Actual label content - this is what gets printed */}
              <div 
                ref={componentRef}
                className={`${sizeClasses[labelSize]} bg-white border rounded-lg p-4 flex flex-col items-center justify-center gap-2 shadow-lg`}
              >
                {/* Grade Badge */}
                {batch.grade && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getGradeColor(batch.grade)}`}>
                    Grade {batch.grade}
                  </span>
                )}

                {/* Batch ID */}
                <h3 className="text-lg font-bold text-center">{batch.batch_id}</h3>

                {/* QR Code placeholder - in production, use actual QR component */}
                <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <span className="text-xs text-gray-500">QR Code</span>
                </div>

                {/* Barcode */}
                <Barcode
                  value={batch.batch_id}
                  format="CODE128"
                  width={1.5}
                  height={40}
                  displayValue={false}
                />

                {/* Details */}
                <div className="text-xs text-center space-y-0.5">
                  <p>{batch.battery_type}</p>
                  <p>{batch.weight_kg} kg</p>
                  <p>{new Date(batch.receipt_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
