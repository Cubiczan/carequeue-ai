const express = require('express');
const router = express.Router();
const CarbonClient = require('../clients/carbon');

/**
 * Carbon Integration Routes
 */

const carbon = new CarbonClient();

/**
 * GET /api/carbon/production-orders
 * Get production orders from Carbon
 */
router.get('/production-orders', async (req, res) => {
  try {
    const orders = await carbon.getProductionOrders(req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/production-orders
 * Create production order in Carbon
 */
router.post('/production-orders', async (req, res) => {
  try {
    const order = await carbon.createProductionOrder(req.body);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/carbon/production-orders/:id/status
 * Update production order status
 */
router.patch('/production-orders/:id/status', async (req, res) => {
  try {
    const order = await carbon.updateProductionOrderStatus(
      req.params.id,
      req.body.status,
      req.body.data
    );
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/work-orders
 * Get work orders from Carbon
 */
router.get('/work-orders', async (req, res) => {
  try {
    const orders = await carbon.getWorkOrders(req.query);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/work-orders
 * Create work order in Carbon
 */
router.post('/work-orders', async (req, res) => {
  try {
    const order = await carbon.createWorkOrder(req.body);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/work-orders/:id/complete
 * Complete work order
 */
router.post('/work-orders/:id/complete', async (req, res) => {
  try {
    const result = await carbon.completeWorkOrder(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/boms
 * Get BOMs from Carbon
 */
router.get('/boms', async (req, res) => {
  try {
    const boms = await carbon.getBOMs(req.query);
    res.json({ success: true, data: boms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/boms
 * Create BOM in Carbon
 */
router.post('/boms', async (req, res) => {
  try {
    const bom = await carbon.createBOM(req.body);
    res.json({ success: true, data: bom });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/batches
 * Get batches from Carbon
 */
router.get('/batches', async (req, res) => {
  try {
    const batches = await carbon.getBatches(req.query);
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/batches/:id/traceability
 * Get traceability chain for a batch
 */
router.get('/batches/:id/traceability', async (req, res) => {
  try {
    const chain = await carbon.getTraceabilityChain(req.params.id);
    res.json({ success: true, data: chain });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/batches
 * Create batch in Carbon
 */
router.post('/batches', async (req, res) => {
  try {
    const batch = await carbon.createBatch(req.body);
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/quality-inspections
 * Get quality inspections from Carbon
 */
router.get('/quality-inspections', async (req, res) => {
  try {
    const inspections = await carbon.getQualityInspections(req.query);
    res.json({ success: true, data: inspections });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/quality-inspections
 * Create quality inspection in Carbon
 */
router.post('/quality-inspections', async (req, res) => {
  try {
    const inspection = await carbon.createQualityInspection(req.body);
    res.json({ success: true, data: inspection });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/material-consumption
 * Get material consumption records
 */
router.get('/material-consumption', async (req, res) => {
  try {
    const records = await carbon.getMaterialConsumption(req.query);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/carbon/material-consumption
 * Record material consumption
 */
router.post('/material-consumption', async (req, res) => {
  try {
    const record = await carbon.recordMaterialConsumption(req.body);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/analytics/production
 * Get production analytics
 */
router.get('/analytics/production', async (req, res) => {
  try {
    const analytics = await carbon.getProductionAnalytics(req.query);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/carbon/analytics/quality
 * Get quality analytics
 */
router.get('/analytics/quality', async (req, res) => {
  try {
    const analytics = await carbon.getQualityAnalytics(req.query);
    res.json({ success: true, data: analytics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
