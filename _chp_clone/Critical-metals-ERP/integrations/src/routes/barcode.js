const express = require('express');
const router = express.Router();
const BarcodeService = require('../services/barcode');
const { authenticate } = require('../middleware/auth');

const barcodeService = new BarcodeService();

/**
 * POST /api/barcode/generate-batch-id
 * Generate a new unique batch ID
 */
router.post('/generate-batch-id', authenticate, (req, res) => {
  try {
    const { existingBatches, date } = req.body;
    
    let batchId;
    if (existingBatches && Array.isArray(existingBatches)) {
      batchId = barcodeService.generateSequentialBatchId(existingBatches);
    } else {
      batchId = barcodeService.generateBatchId(date ? new Date(date) : new Date());
    }
    
    res.json({
      success: true,
      data: {
        batch_id: batchId,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/barcode/validate
 * Validate a batch ID or scanned code
 */
router.post('/validate', authenticate, (req, res) => {
  try {
    const { code, type = 'batch_id' } = req.body;
    
    if (type === 'batch_id') {
      const validation = barcodeService.validateBatchId(code);
      res.json({
        success: true,
        data: validation
      });
    } else if (type === 'qr_code') {
      const result = barcodeService.parseQRCodeData(code);
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid code type'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/barcode/label-data
 * Generate label data for printing
 */
router.post('/label-data', authenticate, (req, res) => {
  try {
    const { batch, options } = req.body;
    
    const labelData = barcodeService.generateLabelData(batch, options);
    
    res.json({
      success: true,
      data: labelData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/barcode/decode/:code
 * Decode a scanned barcode/QR code
 */
router.get('/decode/:code', authenticate, (req, res) => {
  try {
    const { code } = req.params;
    
    // Try to parse as QR code first
    const qrResult = barcodeService.parseQRCodeData(code);
    
    if (qrResult.valid) {
      res.json({
        success: true,
        data: {
          type: 'qr_code',
          valid: true,
          batch: qrResult.data
        }
      });
    } else {
      // Try as batch ID
      const validation = barcodeService.validateBatchId(code);
      res.json({
        success: true,
        data: {
          type: 'batch_id',
          valid: validation.valid,
          error: validation.error
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/barcode/scan-instructions
 * Get instructions for scanning barcodes
 */
router.get('/scan-instructions', (req, res) => {
  res.json({
    success: true,
    data: {
      supported_formats: ['QR Code', 'Code 128', 'Code 39', 'EAN-13'],
      tips: [
        'Ensure good lighting',
        'Hold camera steady',
        'Keep barcode in frame',
        'Clean camera lens if blurry',
        'For USB scanners: just scan, it will auto-input'
      ],
      batch_id_format: 'BAT-YYYYMMDD-XXXX-C',
      example: 'BAT-20240115-0001-5'
    }
  });
});

module.exports = router;
