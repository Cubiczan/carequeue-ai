/**
 * Carbon API Client
 * 
 * Handles API calls to Carbon Manufacturing Platform
 * Docs: https://carbon.dev/docs
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'CarbonClient' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class CarbonClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || process.env.CARBON_URL || 'http://localhost:3000';
    this.apiKey = config.apiKey || process.env.CARBON_API_KEY;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        logger.error('Carbon API Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  /**
   * Get Production Orders from Carbon
   */
  async getProductionOrders(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/production-orders', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get production orders', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Single Production Order
   */
  async getProductionOrder(id) {
    try {
      const response = await this.axiosInstance.get(`/api/production-orders/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get production order ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Production Order in Carbon
   */
  async createProductionOrder(order) {
    try {
      const response = await this.axiosInstance.post('/api/production-orders', order);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create production order', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update Production Order status
   */
  async updateProductionOrderStatus(id, status, data = {}) {
    try {
      const response = await this.axiosInstance.patch(`/api/production-orders/${id}/status`, {
        status,
        ...data
      });
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update production order status ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Work Orders from Carbon
   */
  async getWorkOrders(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/work-orders', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get work orders', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Work Order in Carbon
   */
  async createWorkOrder(workOrder) {
    try {
      const response = await this.axiosInstance.post('/api/work-orders', workOrder);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create work order', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Complete Work Order
   */
  async completeWorkOrder(id, completionData) {
    try {
      const response = await this.axiosInstance.post(`/api/work-orders/${id}/complete`, completionData);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to complete work order ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Bill of Materials from Carbon
   */
  async getBOMs(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/boms', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get BOMs', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Single BOM
   */
  async getBOM(id) {
    try {
      const response = await this.axiosInstance.get(`/api/boms/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get BOM ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create BOM in Carbon
   */
  async createBOM(bom) {
    try {
      const response = await this.axiosInstance.post('/api/boms', bom);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create BOM', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update BOM in Carbon
   */
  async updateBOM(id, updates) {
    try {
      const response = await this.axiosInstance.patch(`/api/boms/${id}`, updates);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update BOM ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Batch/Lot records from Carbon
   */
  async getBatches(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/batches', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get batches', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Batch in Carbon
   */
  async createBatch(batch) {
    try {
      const response = await this.axiosInstance.post('/api/batches', batch);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create batch', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update Batch in Carbon
   */
  async updateBatch(id, updates) {
    try {
      const response = await this.axiosInstance.patch(`/api/batches/${id}`, updates);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update batch ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Quality Inspection records from Carbon
   */
  async getQualityInspections(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/quality-inspections', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get quality inspections', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Quality Inspection in Carbon
   */
  async createQualityInspection(inspection) {
    try {
      const response = await this.axiosInstance.post('/api/quality-inspections', inspection);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create quality inspection', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update Quality Inspection in Carbon
   */
  async updateQualityInspection(id, updates) {
    try {
      const response = await this.axiosInstance.patch(`/api/quality-inspections/${id}`, updates);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update quality inspection ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Material Consumption records
   */
  async getMaterialConsumption(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/material-consumption', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get material consumption', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Record Material Consumption
   */
  async recordMaterialConsumption(consumption) {
    try {
      const response = await this.axiosInstance.post('/api/material-consumption', consumption);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to record material consumption', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Traceability Chain for a batch
   */
  async getTraceabilityChain(batchId) {
    try {
      const response = await this.axiosInstance.get(`/api/batches/${batchId}/traceability`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get traceability chain for batch ${batchId}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Production Analytics
   */
  async getProductionAnalytics(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/analytics/production', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get production analytics', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Quality Analytics
   */
  async getQualityAnalytics(params = {}) {
    try {
      const response = await this.axiosInstance.get('/api/analytics/quality', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get quality analytics', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sync ERPNext Work Orders to Carbon
   */
  async syncFromERPNext(erpNextWorkOrders) {
    logger.info('Syncing work orders from ERPNext to Carbon', { count: erpNextWorkOrders.length });
    
    const syncResults = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const wo of erpNextWorkOrders) {
      try {
        // Check if work order exists in Carbon
        const existing = await this.getWorkOrders({ erpnext_wo_id: wo.name });
        
        const carbonData = {
          erpnext_wo_id: wo.name,
          item: wo.production_item,
          qty: wo.qty_to_manufacture,
          planned_start_date: wo.planned_start_date,
          planned_end_date: wo.planned_end_date,
          workcenter: wo.workstation,
          status: this.mapWorkOrderStatus(wo.status),
          bom: wo.bom_no,
          project: wo.project
        };

        if (existing && existing.length > 0) {
          await this.updateWorkOrder(existing[0].id, carbonData);
          syncResults.updated++;
        } else {
          await this.createWorkOrder(carbonData);
          syncResults.created++;
        }
      } catch (error) {
        syncResults.errors.push({ wo: wo.name, error: error.message });
      }
    }

    logger.info('Work order sync completed', syncResults);
    return syncResults;
  }

  /**
   * Sync Production Results back to ERPNext
   */
  async syncProductionResults(erpNextClient) {
    logger.info('Syncing production results from Carbon to ERPNext');
    
    const syncResults = {
      stockEntries: 0,
      completedOrders: 0,
      errors: []
    };

    try {
      // Get completed production orders from Carbon
      const completedOrders = await this.getProductionOrders({ status: 'completed' });
      
      for (const order of completedOrders) {
        try {
          // Create Stock Entry in ERPNext
          await erpNextClient.createDoc('Stock Entry', { ...order.stockEntryData, production_order: order.erpnext_wo_id });
          syncResults.stockEntries++;
          
          // Update Work Order status in ERPNext
          await erpNextClient.updateDoc('Work Order', order.erpnext_wo_id, { status: 'Completed' });
          syncResults.completedOrders++;
        } catch (error) {
          syncResults.errors.push({ order: order.id, error: error.message });
        }
      }

      logger.info('Production results sync completed', syncResults);
      return syncResults;
    } catch (error) {
      logger.error('Failed to sync production results', error);
      throw error;
    }
  }

  /**
   * Map ERPNext work order status to Carbon status
   */
  mapWorkOrderStatus(erpnextStatus) {
    const mapping = {
      'Pending': 'pending',
      'Work In Progress': 'in_progress',
      'Completed': 'completed',
      'Stopped': 'stopped'
    };
    return mapping[erpnextStatus] || 'pending';
  }

  /**
   * Map Carbon status to ERPNext status
   */
  mapCarbonStatus(carbonStatus) {
    const mapping = {
      'pending': 'Pending',
      'in_progress': 'Work In Progress',
      'completed': 'Completed',
      'stopped': 'Stopped'
    };
    return mapping[carbonStatus] || 'Pending';
  }
}

module.exports = CarbonClient;
