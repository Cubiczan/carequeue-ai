/**
 * ERPNext ↔ Carbon Sync Service
 * 
 * Bi-directional synchronization between ERPNext and Carbon
 * - Work Orders: ERPNext → Carbon
 * - Production Results: Carbon → ERPNext
 * - Material Consumption: Carbon → ERPNext
 * - Quality Inspections: Carbon → ERPNext
 */

require('dotenv').config({ path: __dirname + '/../../.env' });
const winston = require('winston');
const { createClient } = require('redis');

const ERPNextClient = require('../clients/erpnext');
const CarbonClient = require('../clients/carbon');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'SyncService' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/sync.log' })
  ]
});

class SyncService {
  constructor() {
    this.erpNext = new ERPNextClient();
    this.carbon = new CarbonClient();
    this.redis = null;
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL_MS) || 5000;
    this.isRunning = false;
  }

  async initialize() {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      this.redis.on('error', (err) => logger.error('Redis Error', err));
      await this.redis.connect();
      logger.info('Connected to Redis for sync state management');
    } catch (error) {
      logger.warn('Failed to connect to Redis, running without state persistence');
    }
  }

  /**
   * Run full sync cycle
   */
  async runSync() {
    if (this.isRunning) {
      logger.warn('Sync already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    logger.info('Starting sync cycle');

    const results = {
      workOrders: null,
      productionResults: null,
      materialConsumption: null,
      qualityInspections: null,
      errors: [],
      duration: 0
    };

    try {
      // Sync 1: Work Orders from ERPNext to Carbon
      if (process.env.ENABLE_WORK_ORDER_SYNC !== 'false') {
        results.workOrders = await this.syncWorkOrders();
      }

      // Sync 2: Production Results from Carbon to ERPNext
      if (process.env.ENABLE_PRODUCTION_SYNC !== 'false') {
        results.productionResults = await this.syncProductionResults();
      }

      // Sync 3: Material Consumption from Carbon to ERPNext
      if (process.env.ENABLE_MATERIAL_SYNC !== 'false') {
        results.materialConsumption = await this.syncMaterialConsumption();
      }

      // Sync 4: Quality Inspections from Carbon to ERPNext
      if (process.env.ENABLE_QUALITY_SYNC !== 'false') {
        results.qualityInspections = await this.syncQualityInspections();
      }

      // Record sync completion
      await this.recordSyncCompletion(results);

    } catch (error) {
      logger.error('Sync cycle failed', error);
      results.errors.push({ type: 'sync_failure', error: error.message });
      await this.recordSyncError(error);
    }

    results.duration = Date.now() - startTime;
    this.isRunning = false;

    logger.info('Sync cycle completed', results);
    return results;
  }

  /**
   * Sync Work Orders from ERPNext to Carbon
   */
  async syncWorkOrders() {
    logger.info('Syncing work orders from ERPNext to Carbon');

    // Get pending/in-progress work orders from ERPNext
    const workOrders = await this.erpNext.getList(
      'Work Order',
      { status: ['in', ['Pending', 'Work In Progress', 'Submitted']] },
      ['*'],
      100
    );

    logger.info(`Found ${workOrders.length} work orders to sync`);

    const result = await this.carbon.syncFromERPNext(workOrders);
    
    return result;
  }

  /**
   * Sync Production Results from Carbon to ERPNext
   */
  async syncProductionResults() {
    logger.info('Syncing production results from Carbon to ERPNext');
    return await this.carbon.syncProductionResults(this.erpNext);
  }

  /**
   * Sync Material Consumption from Carbon to ERPNext
   */
  async syncMaterialConsumption() {
    logger.info('Syncing material consumption from Carbon to ERPNext');

    const consumption = await this.carbon.getMaterialConsumption({
      synced_to_erpnext: false
    });

    const results = {
      created: 0,
      errors: []
    };

    for (const record of consumption) {
      try {
        await this.erpNext.createStockEntry({
          stock_entry_type: 'Material Issue',
          work_order: record.erpnext_wo_id,
          items: [{
            item_code: record.material_code,
            qty: record.quantity,
            s_warehouse: record.source_warehouse,
            t_warehouse: record.target_warehouse
          }]
        });

        // Mark as synced in Carbon
        await this.carbon.recordMaterialConsumption({
          ...record,
          synced_to_erpnext: true,
          erpnext_stock_entry: record.erpnext_stock_entry
        });

        results.created++;
      } catch (error) {
        results.errors.push({ record: record.id, error: error.message });
      }
    }

    logger.info(`Material consumption sync completed: ${results.created} created`);
    return results;
  }

  /**
   * Sync Quality Inspections from Carbon to ERPNext
   */
  async syncQualityInspections() {
    logger.info('Syncing quality inspections from Carbon to ERPNext');

    const inspections = await this.carbon.getQualityInspections({
      synced_to_erpnext: false
    });

    const results = {
      created: 0,
      errors: []
    };

    for (const inspection of inspections) {
      try {
        await this.erpNext.createDoc('Quality Inspection', {
          inspection_type: 'In Process',
          reference_type: 'Work Order',
          reference_name: inspection.erpnext_wo_id,
          item_code: inspection.item_code,
          sample_size: inspection.sample_size,
          inspection_date: inspection.inspection_date,
          remarks: inspection.remarks,
          readings: inspection.readings?.map(r => ({
            specification: r.specification,
            status: r.status,
            value: r.value
          }))
        });

        // Mark as synced in Carbon
        await this.carbon.updateQualityInspection(inspection.id, {
          synced_to_erpnext: true
        });

        results.created++;
      } catch (error) {
        results.errors.push({ inspection: inspection.id, error: error.message });
      }
    }

    logger.info(`Quality inspection sync completed: ${results.created} created`);
    return results;
  }

  /**
   * Record sync completion in Redis
   */
  async recordSyncCompletion(results) {
    if (!this.redis) return;

    await this.redis.set('sync:last_completion', JSON.stringify({
      timestamp: new Date().toISOString(),
      status: 'success',
      results: {
        workOrders: results.workOrders?.created + results.workOrders?.updated,
        productionResults: results.productionResults?.stockEntries,
        materialConsumption: results.materialConsumption?.created,
        qualityInspections: results.qualityInspections?.created
      }
    }));

    await this.redis.incr('sync:total_completions');
  }

  /**
   * Record sync error in Redis
   */
  async recordSyncError(error) {
    if (!this.redis) return;

    await this.redis.set('sync:last_error', JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }));

    await this.redis.incr('sync:total_errors');
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const status = {
      isRunning: this.isRunning,
      lastCompletion: null,
      lastError: null,
      totalCompletions: 0,
      totalErrors: 0
    };

    if (this.redis) {
      const lastCompletion = await this.redis.get('sync:last_completion');
      const lastError = await this.redis.get('sync:last_error');
      const totalCompletions = await this.redis.get('sync:total_completions');
      const totalErrors = await this.redis.get('sync:total_errors');

      status.lastCompletion = lastCompletion ? JSON.parse(lastCompletion) : null;
      status.lastError = lastError ? JSON.parse(lastError) : null;
      status.totalCompletions = parseInt(totalCompletions) || 0;
      status.totalErrors = parseInt(totalErrors) || 0;
    }

    return status;
  }

  /**
   * Start continuous sync loop
   */
  startContinuousSync() {
    logger.info(`Starting continuous sync (interval: ${this.syncInterval}ms)`);
    
    const runLoop = async () => {
      await this.runSync();
      setTimeout(runLoop, this.syncInterval);
    };

    runLoop();
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync() {
    logger.info('Manual sync triggered');
    return await this.runSync();
  }
}

// Export singleton instance
const syncService = new SyncService();
module.exports = syncService;
