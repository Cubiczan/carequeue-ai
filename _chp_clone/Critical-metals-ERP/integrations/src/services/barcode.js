/**
 * Barcode Service
 * 
 * Generates barcodes and QR codes for battery batches
 */

const { v4: uuidv4 } = require('uuid');

class BarcodeService {
  /**
   * Generate unique batch ID with checksum
   * Format: BAT-YYYYMMDD-XXXX-C
   * - BAT: Prefix for battery
   * - YYYYMMDD: Date
   * - XXXX: Sequential number
   * - C: Check digit
   */
  generateBatchId(date = new Date(), sequence = 0) {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seqStr = String(sequence).padStart(4, '0');
    const base = `BAT-${dateStr}-${seqStr}`;
    const checkDigit = this.calculateCheckDigit(base);
    return `${base}-${checkDigit}`;
  }

  /**
   * Calculate check digit using modulo 10 algorithm
   */
  calculateCheckDigit(str) {
    let sum = 0;
    let multiply = false;
    
    // Process from right to left
    for (let i = str.length - 1; i >= 0; i--) {
      let digit = parseInt(str.charAt(i));
      if (isNaN(digit)) {
        // Use ASCII value for non-numeric characters
        digit = str.charCodeAt(i) % 10;
      }
      
      if (multiply) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      multiply = !multiply;
    }
    
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Generate QR code data for batch
   * Contains structured JSON data
   */
  generateQRCodeData(batch) {
    return JSON.stringify({
      id: batch.batch_id,
      type: 'battery_batch',
      supplier: batch.supplier,
      battery_type: batch.battery_type,
      weight_kg: batch.weight_kg,
      received: batch.receipt_date,
      checksum: this.calculateCheckDigit(batch.batch_id)
    });
  }

  /**
   * Parse QR code data
   */
  parseQRCodeData(data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== 'battery_batch') {
        throw new Error('Invalid batch QR code');
      }
      
      // Verify checksum
      const isValid = this.calculateCheckDigit(parsed.id) === parseInt(parsed.checksum);
      
      return {
        valid: isValid,
        data: parsed
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate barcode value for batch (Code 128 format)
   */
  generateBarcodeValue(batchId) {
    // Code 128 can encode all ASCII characters
    return batchId;
  }

  /**
   * Generate label data for printing
   */
  generateLabelData(batch, options = {}) {
    const {
      includeQR = true,
      includeBarcode = true,
      includeDetails = true,
      format = 'label' // label, card, full
    } = options;

    const label = {
      batch_id: batch.batch_id,
      generated_at: new Date().toISOString(),
      elements: []
    };

    if (includeQR) {
      label.elements.push({
        type: 'qr_code',
        data: this.generateQRCodeData(batch),
        size: options.qrSize || 100
      });
    }

    if (includeBarcode) {
      label.elements.push({
        type: 'barcode',
        format: 'CODE128',
        data: this.generateBarcodeValue(batch.batch_id),
        width: options.barcodeWidth || 300,
        height: options.barcodeHeight || 50
      });
    }

    if (includeDetails) {
      label.elements.push(
        { type: 'text', content: `Batch: ${batch.batch_id}`, size: 'large', bold: true },
        { type: 'text', content: `Type: ${batch.battery_type}`, size: 'medium' },
        { type: 'text', content: `Supplier: ${batch.supplier}`, size: 'medium' },
        { type: 'text', content: `Weight: ${batch.weight_kg} kg`, size: 'medium' },
        { type: 'text', content: `Received: ${new Date(batch.receipt_date).toLocaleDateString()}`, size: 'small' }
      );
    }

    if (batch.grade) {
      label.elements.push({
        type: 'badge',
        content: `Grade: ${batch.grade}`,
        color: this.getGradeColor(batch.grade)
      });
    }

    return label;
  }

  /**
   * Get color for grade badge
   */
  getGradeColor(grade) {
    const colors = {
      'A': '#22c55e', // green
      'B': '#84cc16', // lime
      'C': '#f59e0b', // amber
      'D': '#f97316', // orange
      'SCRAP': '#ef4444' // red
    };
    return colors[grade] || '#6b7280'; // gray
  }

  /**
   * Validate batch ID format
   */
  validateBatchId(batchId) {
    const pattern = /^BAT-\d{8}-\d{4}-\d$/;
    if (!pattern.test(batchId)) {
      return { valid: false, error: 'Invalid format' };
    }

    const parts = batchId.split('-');
    const base = parts.slice(0, 3).join('-');
    const checkDigit = parseInt(parts[3]);

    if (this.calculateCheckDigit(base) !== checkDigit) {
      return { valid: false, error: 'Invalid check digit' };
    }

    return { valid: true };
  }

  /**
   * Extract date from batch ID
   */
  extractDateFromBatchId(batchId) {
    const parts = batchId.split('-');
    if (parts.length !== 4) return null;
    
    const dateStr = parts[1]; // YYYYMMDD
    if (dateStr.length !== 8) return null;
    
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6));
    const day = parseInt(dateStr.slice(6, 8));
    
    return new Date(year, month - 1, day);
  }

  /**
   * Generate sequential batch ID for same-day batches
   */
  generateSequentialBatchId(existingBatches = []) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find highest sequence number for today
    let maxSeq = 0;
    for (const batch of existingBatches) {
      if (batch.batch_id.includes(todayStr)) {
        const parts = batch.batch_id.split('-');
        const seq = parseInt(parts[2]);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
    
    return this.generateBatchId(today, maxSeq + 1);
  }
}

module.exports = BarcodeService;
