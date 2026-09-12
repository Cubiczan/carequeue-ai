/**
 * Precoro API Client
 * 
 * Handles API calls to Precoro Procurement System
 * Docs: https://www.precoro.com/api-documentation/
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'PrecoroClient' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class PrecoroClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.PRECORO_API_KEY;
    this.companyId = config.companyId || process.env.PRECORO_COMPANY_ID;
    this.baseURL = 'https://api.precoro.com/api/3.0';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Precoro-Company': this.companyId,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        logger.error('Precoro API Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  /**
   * Get Purchase Orders from Precoro
   */
  async getPurchaseOrders(params = {}) {
    try {
      const response = await this.axiosInstance.get('/documents', {
        params: {
          ...params,
          expand: 'items,vendor,approvals'
        }
      });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get purchase orders', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Single Purchase Order
   */
  async getPurchaseOrder(id) {
    try {
      const response = await this.axiosInstance.get(`/documents/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get purchase order ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Purchase Order in Precoro
   */
  async createPurchaseOrder(po) {
    try {
      const response = await this.axiosInstance.post('/documents', po);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create purchase order', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update Purchase Order in Precoro
   */
  async updatePurchaseOrder(id, updates) {
    try {
      const response = await this.axiosInstance.patch(`/documents/${id}`, updates);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update purchase order ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Approve Purchase Order
   */
  async approvePurchaseOrder(id, approvalData) {
    try {
      const response = await this.axiosInstance.post(`/documents/${id}/approve`, approvalData);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to approve purchase order ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Vendors from Precoro
   */
  async getVendors(params = {}) {
    try {
      const response = await this.axiosInstance.get('/vendors', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get vendors', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Single Vendor
   */
  async getVendor(id) {
    try {
      const response = await this.axiosInstance.get(`/vendors/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to get vendor ${id}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Vendor in Precoro
   */
  async createVendor(vendor) {
    try {
      const response = await this.axiosInstance.post('/vendors', vendor);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create vendor', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Items/Products from Precoro
   */
  async getItems(params = {}) {
    try {
      const response = await this.axiosInstance.get('/items', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get items', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Budgets from Precoro
   */
  async getBudgets(params = {}) {
    try {
      const response = await this.axiosInstance.get('/budgets', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get budgets', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Custom Fields from Precoro
   */
  async getCustomFields(params = {}) {
    try {
      const response = await this.axiosInstance.get('/custom-fields', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get custom fields', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get Shipments from Precoro
   */
  async getShipments(params = {}) {
    try {
      const response = await this.axiosInstance.get('/shipments', { params });
      return response.data.data;
    } catch (error) {
      logger.error('Failed to get shipments', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Shipment in Precoro
   */
  async createShipment(shipment) {
    try {
      const response = await this.axiosInstance.post('/shipments', shipment);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create shipment', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Sync Precoro Purchase Orders to ERPNext
   */
  async syncToERPNext(erpNextClient, options = {}) {
    logger.info('Starting Precoro to ERPNext sync', options);
    
    const syncResults = {
      purchaseOrders: 0,
      vendors: 0,
      shipments: 0,
      errors: []
    };

    try {
      // Sync Vendors → Suppliers
      if (options.syncVendors !== false) {
        const vendors = await this.getVendors();
        for (const vendor of vendors) {
          try {
            await erpNextClient.upsertSupplier(vendor);
            syncResults.vendors++;
          } catch (error) {
            syncResults.errors.push({ type: 'vendor', id: vendor.id, error: error.message });
          }
        }
      }

      // Sync Purchase Orders → Purchase Orders
      if (options.syncPurchaseOrders !== false) {
        const pos = await this.getPurchaseOrders({ status: 'approved' });
        for (const po of pos) {
          try {
            await erpNextClient.upsertPurchaseOrder(po);
            syncResults.purchaseOrders++;
          } catch (error) {
            syncResults.errors.push({ type: 'po', id: po.id, error: error.message });
          }
        }
      }

      // Sync Shipments → Purchase Receipts
      if (options.syncShipments !== false) {
        const shipments = await this.getShipments();
        for (const shipment of shipments) {
          try {
            await erpNextClient.upsertPurchaseReceipt(shipment);
            syncResults.shipments++;
          } catch (error) {
            syncResults.errors.push({ type: 'shipment', id: shipment.id, error: error.message });
          }
        }
      }

      logger.info('Precoro to ERPNext sync completed', syncResults);
      return syncResults;
    } catch (error) {
      logger.error('Precoro to ERPNext sync failed', error);
      throw error;
    }
  }
}

module.exports = PrecoroClient;
