const express = require('express');
const router = express.Router();

/**
 * Astra DB Routes
 * 
 * Direct access to Astra DB for time-series and analytics data
 */

/**
 * GET /api/astra/health
 * Check Astra DB connection status
 */
router.get('/health', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    
    if (!astraDB) {
      return res.status(503).json({ 
        success: false, 
        status: 'not_configured',
        message: 'Astra DB not configured' 
      });
    }
    
    res.json({ 
      success: true, 
      status: astraDB.connected ? 'connected' : 'disconnected',
      keyspace: astraDB.keyspace
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/events
 * Record production event
 */
router.post('/events', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const event = req.body;
    await astraDB.insertProductionEvent(event);
    
    res.json({ success: true, message: 'Event recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/events/:workOrderId
 * Get production events for a work order
 */
router.get('/events/:workOrderId', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { workOrderId } = req.params;
    const { limit = 100 } = req.query;
    
    const events = await astraDB.getProductionEvents(workOrderId, parseInt(limit));
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/batches
 * Upsert batch genealogy record
 */
router.post('/batches', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const batch = req.body;
    await astraDB.upsertBatchGenealogy(batch);
    
    res.json({ success: true, message: 'Batch recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/batches/:batchId
 * Get batch genealogy
 */
router.get('/batches/:batchId', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { batchId } = req.params;
    const genealogy = await astraDB.getBatchGenealogy(batchId);
    
    if (!genealogy) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    
    res.json({ success: true, data: genealogy });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/quality
 * Record quality inspection
 */
router.post('/quality', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const inspection = req.body;
    await astraDB.insertQualityRecord(inspection);
    
    res.json({ success: true, message: 'Quality record created' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/recovery
 * Record material recovery
 */
router.post('/recovery', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const recovery = req.body;
    await astraDB.insertMaterialRecovery(recovery);
    
    res.json({ success: true, message: 'Recovery recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/recovery/:batchId
 * Get material recovery by batch
 */
router.get('/recovery/:batchId', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { batchId } = req.params;
    const recovery = await astraDB.getMaterialRecoveryByBatch(batchId);
    
    res.json({ success: true, data: recovery });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/metrics
 * Update production metrics
 */
router.post('/metrics', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { date, ...metrics } = req.body;
    await astraDB.updateProductionMetrics(date, metrics);
    
    res.json({ success: true, message: 'Metrics updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/metrics
 * Get production metrics for date range
 */
router.get('/metrics', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { startDate, endDate } = req.query;
    const metrics = await astraDB.getProductionMetrics(startDate, endDate);
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/astra/sensors
 * Record sensor reading
 */
router.post('/sensors', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const reading = req.body;
    await astraDB.insertSensorReading(reading);
    
    res.json({ success: true, message: 'Sensor reading recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/sensors/:sensorId
 * Get sensor readings
 */
router.get('/sensors/:sensorId', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { sensorId } = req.params;
    const { metricName, limit = 100 } = req.query;
    
    const readings = await astraDB.getSensorReadings(sensorId, metricName, parseInt(limit));
    res.json({ success: true, data: readings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/astra/traceability/:batchId
 * Get complete traceability chain for a batch
 */
router.get('/traceability/:batchId', async (req, res) => {
  try {
    const astraDB = req.app.get('astraDB');
    if (!astraDB) return res.status(503).json({ success: false, error: 'Astra DB not available' });

    const { batchId } = req.params;
    
    // Get batch genealogy
    const genealogy = await astraDB.getBatchGenealogy(batchId);
    if (!genealogy) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    
    // Get material recovery
    const recovery = await astraDB.getMaterialRecoveryByBatch(batchId);
    
    // Get production events
    const events = await astraDB.getProductionEvents(batchId, 50);
    
    res.json({
      success: true,
      data: {
        genealogy,
        recovery,
        events,
        mass_balance: calculateMassBalance(genealogy, recovery)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateMassBalance(genealogy, recovery) {
  const inputKg = genealogy?.weight_kg || 0;
  const recoveredKg = recovery?.reduce((sum, r) => sum + (r.quantity_kg || 0), 0) || 0;
  const wasteKg = inputKg - recoveredKg;
  const recoveryRate = inputKg > 0 ? ((recoveredKg / inputKg) * 100).toFixed(2) : 0;
  
  return {
    input_kg: inputKg,
    recovered_kg: recoveredKg,
    waste_kg: Math.max(0, wasteKg),
    recovery_rate: parseFloat(recoveryRate)
  };
}

module.exports = router;
