const express = require('express');
const router = express.Router();
const PrecoroClient = require('../clients/precoro');
const ERPNextClient = require('../clients/erpnext');

/**
 * Precoro Integration Routes
 */

const precoro = new PrecoroClient();
const erpNext = new ERPNextClient();

/**
 * GET /api/precoro/vendors
 * Get vendors from Precoro
 */
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await precoro.getVendors(req.query);
    res.json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/precoro/vendors
 * Create vendor in Precoro
 */
router.post('/vendors', async (req, res) => {
  try {
    const vendor = await precoro.createVendor(req.body);
    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/precoro/purchase-orders
 * Get purchase orders from Precoro
 */
router.get('/purchase-orders', async (req, res) => {
  try {
    const pos = await precoro.getPurchaseOrders(req.query);
    res.json({ success: true, data: pos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/precoro/purchase-orders/:id
 * Get single purchase order
 */
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await precoro.getPurchaseOrder(req.params.id);
    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/precoro/purchase-orders
 * Create purchase order in Precoro
 */
router.post('/purchase-orders', async (req, res) => {
  try {
    const po = await precoro.createPurchaseOrder(req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/precoro/purchase-orders/:id
 * Update purchase order in Precoro
 */
router.patch('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await precoro.updatePurchaseOrder(req.params.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/precoro/purchase-orders/:id/approve
 * Approve purchase order
 */
router.post('/purchase-orders/:id/approve', async (req, res) => {
  try {
    const po = await precoro.approvePurchaseOrder(req.params.id, req.body);
    res.json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/precoro/shipments
 * Get shipments from Precoro
 */
router.get('/shipments', async (req, res) => {
  try {
    const shipments = await precoro.getShipments(req.query);
    res.json({ success: true, data: shipments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/precoro/shipments
 * Create shipment in Precoro
 */
router.post('/shipments', async (req, res) => {
  try {
    const shipment = await precoro.createShipment(req.body);
    res.json({ success: true, data: shipment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/precoro/sync
 * Trigger full Precoro to ERPNext sync
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await precoro.syncToERPNext(erpNext, req.body.options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
