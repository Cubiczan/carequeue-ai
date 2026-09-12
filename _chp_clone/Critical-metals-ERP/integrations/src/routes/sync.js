const express = require('express');
const router = express.Router();
const syncService = require('../services/sync');

/**
 * Sync Control Routes
 * 
 * Manual triggers and status endpoints for sync operations
 */

/**
 * Get current sync status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await syncService.getSyncStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger manual sync
 */
router.post('/trigger', async (req, res) => {
  try {
    const result = await syncService.triggerManualSync();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Sync specific data type
 */
router.post('/trigger/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let result;

    switch (type) {
      case 'work-orders':
        result = await syncService.syncWorkOrders();
        break;
      case 'production-results':
        result = await syncService.syncProductionResults();
        break;
      case 'material-consumption':
        result = await syncService.syncMaterialConsumption();
        break;
      case 'quality-inspections':
        result = await syncService.syncQualityInspections();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown sync type: ${type}`
        });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync history (last N completions)
 */
router.get('/history', async (req, res) => {
  try {
    // This would ideally query a database
    // For now, return placeholder
    res.json({
      success: true,
      data: {
        message: 'Sync history not implemented yet',
        limit: parseInt(req.query.limit) || 10
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
 * Get sync metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const status = await syncService.getSyncStatus();
    
    res.json({
      success: true,
      data: {
        totalCompletions: status.totalCompletions,
        totalErrors: status.totalErrors,
        successRate: status.totalCompletions > 0 
          ? ((status.totalCompletions - status.totalErrors) / status.totalCompletions * 100).toFixed(2)
          : 100,
        lastSync: status.lastCompletion,
        lastError: status.lastError
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
