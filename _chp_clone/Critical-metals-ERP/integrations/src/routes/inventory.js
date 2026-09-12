const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, requirePermission } = require('../middleware/auth');

// In-memory inventory store
const inventory = new Map([
  ['item-001', {
    item_code: 'COB-SULF-001',
    item_name: 'Cobalt Sulfate',
    category: 'Recovered Materials',
    warehouses: {
      'WH-001': { quantity: 500, unit: 'kg', last_updated: new Date() },
      'WH-002': { quantity: 250, unit: 'kg', last_updated: new Date() }
    },
    reorder_point: 100,
    unit_price: 15.50
  }],
  ['item-002', {
    item_code: 'NIC-SULF-001',
    item_name: 'Nickel Sulfate',
    category: 'Recovered Materials',
    warehouses: {
      'WH-001': { quantity: 800, unit: 'kg', last_updated: new Date() }
    },
    reorder_point: 150,
    unit_price: 12.75
  }],
  ['item-003', {
    item_code: 'LIT-CARB-001',
    item_name: 'Lithium Carbonate',
    category: 'Recovered Materials',
    warehouses: {
      'WH-001': { quantity: 50, unit: 'kg', last_updated: new Date() }
    },
    reorder_point: 100,
    unit_price: 25.00
  }]
]);

const warehouses = new Map([
  ['WH-001', { code: 'WH-001', name: 'Raw Materials Warehouse', type: 'raw_materials' }],
  ['WH-002', { code: 'WH-002', name: 'Recovered Materials', type: 'finished_goods' }],
  ['WH-003', { code: 'WH-003', name: 'Hazardous Waste Storage', type: 'hazmat' }]
]);

/**
 * GET /api/inventory/items
 * List all inventory items
 */
router.get('/items', authenticate, requirePermission('inventory:view'), (req, res) => {
  const { category, search } = req.query;
  
  let items = Array.from(inventory.values());
  
  if (category) {
    items = items.filter(i => i.category === category);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    items = items.filter(i => 
      i.item_code.toLowerCase().includes(searchLower) ||
      i.item_name.toLowerCase().includes(searchLower)
    );
  }
  
  res.json({
    success: true,
    data: items
  });
});

/**
 * GET /api/inventory/items/:itemCode
 * Get item details with stock levels
 */
router.get('/items/:itemCode', authenticate, requirePermission('inventory:view'), (req, res) => {
  const item = Array.from(inventory.values()).find(i => i.item_code === req.params.itemCode);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  res.json({
    success: true,
    data: item
  });
});

/**
 * GET /api/inventory/warehouses
 * List warehouses
 */
router.get('/warehouses', authenticate, requirePermission('inventory:view'), (req, res) => {
  res.json({
    success: true,
    data: Array.from(warehouses.values())
  });
});

/**
 * GET /api/inventory/levels
 * Get stock levels across warehouses
 */
router.get('/levels', authenticate, requirePermission('inventory:view'), (req, res) => {
  const { warehouse, lowStock } = req.query;
  
  const levels = [];
  
  for (const item of inventory.values()) {
    for (const [whCode, stock] of Object.entries(item.warehouses)) {
      if (warehouse && whCode !== warehouse) continue;
      
      levels.push({
        item_code: item.item_code,
        item_name: item.item_name,
        warehouse: whCode,
        quantity: stock.quantity,
        unit: stock.unit,
        reorder_point: item.reorder_point,
        is_low: stock.quantity < item.reorder_point
      });
    }
  }
  
  let result = levels;
  if (lowStock === 'true') {
    result = levels.filter(l => l.is_low);
  }
  
  res.json({
    success: true,
    data: result
  });
});

/**
 * GET /api/inventory/alerts
 * Get low stock alerts
 */
router.get('/alerts', authenticate, requirePermission('inventory:view'), (req, res) => {
  const alerts = [];
  
  for (const item of inventory.values()) {
    for (const [whCode, stock] of Object.entries(item.warehouses)) {
      if (stock.quantity < item.reorder_point) {
        alerts.push({
          type: 'low_stock',
          severity: stock.quantity < (item.reorder_point / 2) ? 'high' : 'medium',
          item_code: item.item_code,
          item_name: item.item_name,
          warehouse: whCode,
          current_quantity: stock.quantity,
          reorder_point: item.reorder_point,
          unit: stock.unit,
          suggested_order: item.reorder_point * 2 - stock.quantity
        });
      }
    }
  }
  
  res.json({
    success: true,
    data: {
      total_alerts: alerts.length,
      alerts
    }
  });
});

/**
 * POST /api/inventory/transfers
 * Create stock transfer between warehouses
 */
router.post('/transfers', authenticate, requirePermission('inventory:update'), [
  body('item_code').notEmpty().withMessage('Item code is required'),
  body('from_warehouse').notEmpty().withMessage('Source warehouse is required'),
  body('to_warehouse').notEmpty().withMessage('Destination warehouse is required'),
  body('quantity').isFloat({ min: 0 }).withMessage('Valid quantity is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { item_code, from_warehouse, to_warehouse, quantity } = req.body;
  
  // Find item
  const item = Array.from(inventory.values()).find(i => i.item_code === item_code);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  // Check source stock
  const sourceStock = item.warehouses[from_warehouse];
  if (!sourceStock || sourceStock.quantity < quantity) {
    return res.status(400).json({
      success: false,
      error: 'Insufficient stock at source warehouse'
    });
  }
  
  // Execute transfer
  sourceStock.quantity -= quantity;
  sourceStock.last_updated = new Date();
  
  if (!item.warehouses[to_warehouse]) {
    item.warehouses[to_warehouse] = { quantity: 0, unit: sourceStock.unit };
  }
  item.warehouses[to_warehouse].quantity += quantity;
  item.warehouses[to_warehouse].last_updated = new Date();
  
  const transfer = {
    transfer_id: `TRF-${Date.now()}`,
    created_at: new Date(),
    item_code,
    from_warehouse,
    to_warehouse,
    quantity,
    unit: sourceStock.unit,
    status: 'completed'
  };
  
  res.status(201).json({
    success: true,
    data: transfer
  });
});

/**
 * POST /api/inventory/adjustments
 * Create stock adjustment
 */
router.post('/adjustments', authenticate, requirePermission('inventory:update'), [
  body('item_code').notEmpty().withMessage('Item code is required'),
  body('warehouse').notEmpty().withMessage('Warehouse is required'),
  body('adjustment').isFloat().withMessage('Valid adjustment is required'),
  body('reason').notEmpty().withMessage('Reason is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { item_code, warehouse, adjustment, reason } = req.body;
  
  const item = Array.from(inventory.values()).find(i => i.item_code === item_code);
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Item not found'
    });
  }
  
  if (!item.warehouses[warehouse]) {
    return res.status(400).json({
      success: false,
      error: 'Item not stored in this warehouse'
    });
  }
  
  const oldQuantity = item.warehouses[warehouse].quantity;
  item.warehouses[warehouse].quantity += adjustment;
  item.warehouses[warehouse].last_updated = new Date();
  
  const adjustment_record = {
    adjustment_id: `ADJ-${Date.now()}`,
    created_at: new Date(),
    item_code,
    warehouse,
    old_quantity: oldQuantity,
    adjustment,
    new_quantity: item.warehouses[warehouse].quantity,
    reason,
    user: req.user.username
  };
  
  res.status(201).json({
    success: true,
    data: adjustment_record
  });
});

module.exports = router;
