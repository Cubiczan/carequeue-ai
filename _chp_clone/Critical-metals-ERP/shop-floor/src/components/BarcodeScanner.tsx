import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { XMarkIcon, ScanBarcodeIcon } from '@heroicons/react/24/outline';

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
  formats?: string[];
  showInverted?: boolean;
}

export default function BarcodeScanner({ 
  onScan, 
  onError, 
  onClose,
  formats = ['QR_CODE', 'CODE_128', 'CODE_39', 'EAN_13'],
  showInverted = true
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize scanner
    if (scannerContainerRef.current && !isScanning) {
      const scanner = new Html5QrcodeScanner(
        'scanner-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          verbose: true
        },
        /* showTorch= */ false
      );

      scannerRef.current = scanner;
      setIsScanning(true);

      scanner.render(
        (decodedText, decodedResult) => {
          // Success callback
          console.log('Scan successful:', decodedText);
          handleScanSuccess(decodedText, decodedResult);
        },
        (error) => {
          // Error callback (usually just means no code in frame)
          // Don't show these errors as they happen constantly
        }
      );
    }

    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string, decodedResult: any) => {
    // Prevent duplicate scans
    if (!isScanning) return;

    setIsScanning(false);
    
    // Stop scanner
    if (scannerRef.current) {
      scannerRef.current.clear().then(() => {
        scannerRef.current = null;
      }).catch(console.error);
    }

    // Notify parent
    onScan(decodedText);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim()) {
      setScanError('Please enter a code');
      return;
    }

    onScan(manualCode.trim());
  };

  const handleCameraError = (error: any) => {
    console.error('Camera error:', error);
    setScanError('Camera access denied. Please use manual entry or enable camera permissions.');
    if (onError) onError(error.message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ScanBarcodeIcon className="w-6 h-6 text-green-600" />
            Scan Barcode
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          <div 
            ref={scannerContainerRef} 
            id="scanner-container"
            className="mb-4"
          />

          {scanError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {scanError}
            </div>
          )}

          {/* Manual Entry */}
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-600 mb-3 font-medium">
              Or enter code manually:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g., BAT-20240115-0001-5"
                className="input flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Submit
              </button>
            </form>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Scanning Tips:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Position barcode/QR code within the frame</li>
              <li>• Ensure good lighting</li>
              <li>• Hold device steady</li>
              <li>• Supported: QR Code, Code 128, Code 39, EAN-13</li>
              <li>• For USB scanners: Just scan, it will auto-input</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
