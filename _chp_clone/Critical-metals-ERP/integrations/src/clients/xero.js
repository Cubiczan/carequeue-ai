/**
 * Xero API Client
 * 
 * Handles authentication and API calls to Xero Accounting
 * Docs: https://developer.xero.com/documentation/
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'XeroClient' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class XeroClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.XERO_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.XERO_CLIENT_SECRET;
    this.tenantId = config.tenantId || process.env.XERO_TENANT_ID;
    this.baseURL = 'https://api.xero.com/api.xro/2.0';
    this.authURL = 'https://identity.xero.com/connect/token';
    
    this.accessToken = null;
    this.tokenExpiry = null;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Xero-Tenant-Id': this.tenantId,
        'Accept': 'application/json'
      }
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        logger.error('Xero API Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  /**
   * Get OAuth2 access token using client credentials
   */
  async authenticate() {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry > Date.now()) {
        return this.accessToken;
      }

      const response = await axios.post(
        this.authURL,
        'grant_type=client_credentials',
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 60s early
      
      logger.info('Xero authentication successful', {
        expiresIn: response.data.expires_in,
        scope: response.data.scope
      });

      return this.accessToken;
    } catch (error) {
      logger.error('Xero authentication failed', error.response?.data || error.message);
      throw new Error(`Xero auth failed: ${error.message}`);
    }
  }

  /**
   * Ensure authenticated before making requests
   */
  async ensureAuth() {
    if (!this.accessToken || !this.tokenExpiry) {
      await this.authenticate();
    }
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
  }

  /**
   * Get Accounts from Xero
   */
  async getAccounts() {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/Accounts');
    return response.data.Accounts;
  }

  /**
   * Get Invoices from Xero
   */
  async getInvoices(params = {}) {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/Invoices', { params });
    return response.data.Invoices;
  }

  /**
   * Create Invoice in Xero
   */
  async createInvoice(invoice) {
    await this.ensureAuth();
    const response = await this.axiosInstance.put('/Invoices', {
      Invoices: [invoice]
    });
    return response.data.Invoices[0];
  }

  /**
   * Update Invoice in Xero
   */
  async updateInvoice(invoiceId, invoice) {
    await this.ensureAuth();
    const response = await this.axiosInstance.post('/Invoices', {
      Invoices: [{
        InvoiceID: invoiceId,
        ...invoice
      }]
    });
    return response.data.Invoices[0];
  }

  /**
   * Get Payments from Xero
   */
  async getPayments(params = {}) {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/Payments', { params });
    return response.data.Payments;
  }

  /**
   * Create Payment in Xero
   */
  async createPayment(payment) {
    await this.ensureAuth();
    const response = await this.axiosInstance.put('/Payments', {
      Payments: [payment]
    });
    return response.data.Payments[0];
  }

  /**
   * Get Contacts from Xero
   */
  async getContacts(params = {}) {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/Contacts', { params });
    return response.data.Contacts;
  }

  /**
   * Create/Update Contact in Xero
   */
  async upsertContact(contact) {
    await this.ensureAuth();
    const response = await this.axiosInstance.put('/Contacts', {
      Contacts: [contact]
    });
    return response.data.Contacts[0];
  }

  /**
   * Get Purchase Bills from Xero
   */
  async getBills(params = {}) {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/APInvoices', { params });
    return response.data.APInvoices;
  }

  /**
   * Create Purchase Bill in Xero
   */
  async createBill(bill) {
    await this.ensureAuth();
    const response = await this.axiosInstance.put('/APInvoices', {
      APInvoices: [bill]
    });
    return response.data.APInvoices[0];
  }

  /**
   * Get Journal Entries from Xero
   */
  async getJournals(params = {}) {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/Journals', { params });
    return response.data.Journals;
  }

  /**
   * Create Manual Journal in Xero
   */
  async createJournal(journal) {
    await this.ensureAuth();
    const response = await this.axiosInstance.put('/ManualJournals', {
      ManualJournals: [journal]
    });
    return response.data.ManualJournals[0];
  }

  /**
   * Get Tracking Categories from Xero
   */
  async getTrackingCategories() {
    await this.ensureAuth();
    const response = await this.axiosInstance.get('/TrackingCategories');
    return response.data.TrackingCategories;
  }

  /**
   * Sync Xero data to ERPNext
   * This is called by the sync service
   */
  async syncToERPNext(erpNextClient, options = {}) {
    logger.info('Starting Xero to ERPNext sync', options);
    
    const syncResults = {
      accounts: 0,
      contacts: 0,
      invoices: 0,
      bills: 0,
      payments: 0,
      errors: []
    };

    try {
      // Sync Accounts → Chart of Accounts
      if (options.syncAccounts !== false) {
        const accounts = await this.getAccounts();
        for (const account of accounts) {
          try {
            await erpNextClient.upsertAccount(account);
            syncResults.accounts++;
          } catch (error) {
            syncResults.errors.push({ type: 'account', id: account.AccountID, error: error.message });
          }
        }
      }

      // Sync Contacts → Customers/Suppliers
      if (options.syncContacts !== false) {
        const contacts = await this.getContacts();
        for (const contact of contacts) {
          try {
            await erpNextClient.upsertParty(contact);
            syncResults.contacts++;
          } catch (error) {
            syncResults.errors.push({ type: 'contact', id: contact.ContactID, error: error.message });
          }
        }
      }

      // Sync Invoices → Sales Invoices
      if (options.syncInvoices !== false) {
        const invoices = await this.getInvoices({ statuses: 'AUTHORISED' });
        for (const invoice of invoices) {
          try {
            await erpNextClient.upsertInvoice(invoice);
            syncResults.invoices++;
          } catch (error) {
            syncResults.errors.push({ type: 'invoice', id: invoice.InvoiceID, error: error.message });
          }
        }
      }

      // Sync Bills → Purchase Invoices
      if (options.syncBills !== false) {
        const bills = await this.getBills({ statuses: 'AUTHORISED' });
        for (const bill of bills) {
          try {
            await erpNextClient.upsertBill(bill);
            syncResults.bills++;
          } catch (error) {
            syncResults.errors.push({ type: 'bill', id: bill.InvoiceID, error: error.message });
          }
        }
      }

      // Sync Payments
      if (options.syncPayments !== false) {
        const payments = await this.getPayments();
        for (const payment of payments) {
          try {
            await erpNextClient.upsertPayment(payment);
            syncResults.payments++;
          } catch (error) {
            syncResults.errors.push({ type: 'payment', id: payment.PaymentID, error: error.message });
          }
        }
      }

      logger.info('Xero to ERPNext sync completed', syncResults);
      return syncResults;
    } catch (error) {
      logger.error('Xero to ERPNext sync failed', error);
      throw error;
    }
  }
}

module.exports = XeroClient;
