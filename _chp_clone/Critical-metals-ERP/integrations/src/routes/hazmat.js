const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth');

// In-memory store (would use Astra DB in production)
const manifests = new Map();
const pickups = new Map();

/**
 * GET /api/hazmat/manifests
 * List all hazardous waste manifests
 */
router.get('/manifests', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const { status, wasteType } = req.query;
  
  let result = Array.from(manifests.values());
  
  if (status) {
    result = result.filter(m => m.status === status);
  }
  
  if (wasteType) {
    result = result.filter(m => m.waste_type === wasteType);
  }
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * GET /api/hazmat/manifests/:id
 * Get single manifest
 */
router.get('/manifests/:id', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const manifest = manifests.get(req.params.id);
  
  if (!manifest) {
    return res.status(404).json({
      success: false,
      error: 'Manifest not found'
    });
  }
  
  res.json({
    success: true,
    data: manifest
  });
});

/**
 * POST /api/hazmat/manifests
 * Create new hazardous waste manifest
 */
router.post('/manifests', authenticate, requirePermission('hazmat:create'), [
  body('waste_type').notEmpty().withMessage('Waste type is required'),
  body('generator').notEmpty().withMessage('Generator information is required'),
  body('storage_location').notEmpty().withMessage('Storage location is required'),
  body('accumulation_start_date').isISO8601().withMessage('Valid date is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const manifest = {
    manifest_id: `MAN-${Date.now()}`,
    created_at: new Date(),
    status: 'pending',
    waste_items: [],
    total_weight_kg: 0,
    ...req.body
  };

  manifests.set(manifest.manifest_id, manifest);

  res.status(201).json({
    success: true,
    data: manifest
  });
});

/**
 * POST /api/hazmat/manifests/:id/items
 * Add waste item to manifest
 */
router.post('/manifests/:id/items', authenticate, requirePermission('hazmat:create'), [
  body('waste_code').notEmpty().withMessage('Waste code is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('weight_kg').isFloat({ min: 0 }).withMessage('Valid weight is required')
], (req, res) => {
  const manifest = manifests.get(req.params.id);
  
  if (!manifest) {
    return res.status(404).json({
      success: false,
      error: 'Manifest not found'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const item = {
    item_id: `ITEM-${Date.now()}`,
    added_at: new Date(),
    ...req.body
  };

  manifest.waste_items.push(item);
  manifest.total_weight_kg += item.weight_kg;

  res.status(201).json({
    success: true,
    data: item
  });
});

/**
 * PATCH /api/hazmat/manifests/:id/status
 * Update manifest status
 */
router.patch('/manifests/:id/status', authenticate, requirePermission('hazmat:update'), [
  body('status').isIn(['pending', 'in_storage', 'scheduled', 'in_transit', 'disposed']).withMessage('Invalid status')
], (req, res) => {
  const manifest = manifests.get(req.params.id);
  
  if (!manifest) {
    return res.status(404).json({
      success: false,
      error: 'Manifest not found'
    });
  }

  const { status, ...additionalData } = req.body;
  const oldStatus = manifest.status;
  
  manifest.status = status;
  manifest.updated_at = new Date();

  res.json({
    success: true,
    data: {
      manifest_id: manifest.manifest_id,
      old_status: oldStatus,
      new_status: status
    }
  });
});

/**
 * POST /api/hazmat/manifests/:id/pickup
 * Schedule waste pickup
 */
router.post('/manifests/:id/pickup', authenticate, requirePermission('hazmat:update'), [
  body('scheduled_date').isISO8601().withMessage('Valid date is required'),
  body('vendor').notEmpty().withMessage('Vendor is required'),
  body('vendor_epa_id').notEmpty().withMessage('Vendor EPA ID is required')
], (req, res) => {
  const manifest = manifests.get(req.params.id);
  
  if (!manifest) {
    return res.status(404).json({
      success: false,
      error: 'Manifest not found'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const pickup = {
    pickup_id: `PICKUP-${Date.now()}`,
    manifest_id: manifest.manifest_id,
    ...req.body,
    status: 'scheduled',
    created_at: new Date()
  };

  pickups.set(pickup.pickup_id, pickup);
  manifest.status = 'scheduled';

  res.status(201).json({
    success: true,
    data: pickup
  });
});

/**
 * GET /api/hazmat/pickups
 * List scheduled pickups
 */
router.get('/pickups', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const { status, vendor } = req.query;
  
  let result = Array.from(pickups.values());
  
  if (status) {
    result = result.filter(p => p.status === status);
  }
  
  if (vendor) {
    result = result.filter(p => p.vendor === vendor);
  }
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * GET /api/hazmat/compliance/attention
 * Get manifests requiring attention (accumulation time)
 */
router.get('/compliance/attention', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const { days = 90 } = req.query;
  const threshold = parseInt(days);
  const now = new Date();
  
  const needingAttention = [];
  
  for (const manifest of manifests.values()) {
    if (manifest.status === 'disposed') continue;
    
    const accumulationStart = new Date(manifest.accumulation_start_date);
    const daysAccumulated = Math.floor((now - accumulationStart) / (1000 * 60 * 60 * 24));
    
    if (daysAccumulated >= threshold) {
      needingAttention.push({
        ...manifest,
        days_accumulated: daysAccumulated,
        compliance: {
          days_accumulated: daysAccumulated,
          max_days: threshold,
          is_compliant: daysAccumulated <= threshold,
          days_remaining: threshold - daysAccumulated
        }
      });
    }
  }
  
  // Sort by days accumulated (most urgent first)
  needingAttention.sort((a, b) => b.days_accumulated - a.days_accumulated);
  
  res.json({
    success: true,
    data: needingAttention
  });
});

/**
 * GET /api/hazmat/compliance/report
 * Generate compliance report
 */
router.get('/compliance/report', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const { startDate, endDate, type = 'quarterly' } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
  const end = endDate ? new Date(endDate) : new Date();
  
  // Generate summary
  const manifests_in_period = Array.from(manifests.values()).filter(
    m => new Date(m.created_at) >= start && new Date(m.created_at) <= end
  );
  
  const byWasteType = {};
  let totalWeight = 0;
  
  for (const manifest of manifests_in_period) {
    if (!byWasteType[manifest.waste_type]) {
      byWasteType[manifest.waste_type] = { count: 0, weight: 0 };
    }
    byWasteType[manifest.waste_type].count++;
    byWasteType[manifest.waste_type].weight += manifest.total_weight_kg;
    totalWeight += manifest.total_weight_kg;
  }
  
  res.json({
    success: true,
    data: {
      report_type: type,
      period: { start: start.toISOString(), end: end.toISOString() },
      generated_at: new Date(),
      summary: {
        total_manifests: manifests_in_period.length,
        total_weight_kg: totalWeight,
        by_waste_type: byWasteType
      },
      compliance_status: 'compliant'
    }
  });
});

/**
 * GET /api/hazmat/storage/inventory
 * Get storage location inventory
 */
router.get('/storage/inventory', authenticate, requirePermission('hazmat:view'), (req, res) => {
  const { location } = req.query;
  
  const inStorage = Array.from(manifests.values()).filter(m => m.status === 'in_storage');
  
  let inventory = inStorage;
  if (location) {
    inventory = inventory.filter(m => m.storage_location === location);
  }
  
  // Group by location and waste type
  const grouped = {};
  let totalWeight = 0;
  
  for (const manifest of inventory) {
    const key = `${manifest.storage_location}-${manifest.waste_type}`;
    if (!grouped[key]) {
      grouped[key] = {
        location: manifest.storage_location,
        waste_type: manifest.waste_type,
        manifest_count: 0,
        total_weight_kg: 0
      };
    }
    grouped[key].manifest_count++;
    grouped[key].total_weight_kg += manifest.total_weight_kg;
    totalWeight += manifest.total_weight_kg;
  }
  
  res.json({
    success: true,
    data: {
      locations: Object.values(grouped),
      total_manifests: inventory.length,
      total_weight_kg: totalWeight
    }
  });
});

/**
 * GET /api/hazmat/waste-codes
 * Get list of EPA waste codes
 */
router.get('/waste-codes', authenticate, (req, res) => {
  const wasteCodes = [
    { code: 'D001', description: 'Ignitability - Liquid (flash point < 60°C)' },
    { code: 'D002', description: 'Ignitability - Solid' },
    { code: 'D003', description: 'Reactivity' },
    { code: 'D004', description: 'Arsenic' },
    { code: 'D005', description: 'Barium' },
    { code: 'D006', description: 'Cadmium' },
    { code: 'D007', description: 'Chromium' },
    { code: 'D008', description: 'Lead' },
    { code: 'D009', description: 'Mercury' },
    { code: 'D010', description: 'Selenium' },
    { code: 'D011', description: 'Silver' },
    { code: 'D018', description: 'Benzene' },
    { code: 'D019', description: 'Carbon Tetrachloride' },
    { code: 'D021', description: 'Chloroform' },
    { code: 'D022', description: 'Cresol' },
    { code: 'D035', description: 'Toluene' },
    { code: 'D039', description: 'Xylene' },
    { code: 'F006', description: 'Wastewater treatment sludges' },
    { code: 'U001', description: 'Acetone' },
    { code: 'U002', description: 'Acetonitrile' }
  ];
  
  res.json({
    success: true,
    data: wasteCodes
  });
});

module.exports = router;
