/**
 * ERPNext API Client
 * 
 * Handles API calls to ERPNext via Frappe REST API
 * Docs: https://frappeframework.com/docs/user/en/api
 */

const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'ERPNextClient' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

class ERPNextClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || process.env.ERPNext_URL || 'http://localhost:8080';
    this.apiKey = config.apiKey || process.env.ERPNext_API_KEY;
    this.apiSecret = config.apiSecret || process.env.ERPNext_API_SECRET;
    this.site = config.site || 'erp.battery-recycling.local';
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        logger.error('ERPNext API Error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url
        });
        throw error;
      }
    );
  }

  /**
   * Generic GET request
   */
  async get(resource, params = {}) {
    const response = await this.axiosInstance.get(`/api/resource/${resource}`, { params });
    return response.data.data;
  }

  /**
   * Get single document by ID
   */
  async getDoc(doctype, id) {
    const response = await this.axiosInstance.get(`/api/resource/${doctype}/${id}`);
    return response.data.data;
  }

  /**
   * Create document
   */
  async createDoc(doctype, data) {
    const response = await this.axiosInstance.post(`/api/resource/${doctype}`, data);
    return response.data.data;
  }

  /**
   * Update document
   */
  async updateDoc(doctype, id, data) {
    const response = await this.axiosInstance.put(`/api/resource/${doctype}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete document
   */
  async deleteDoc(doctype, id) {
    const response = await this.axiosInstance.delete(`/api/resource/${doctype}/${id}`);
    return response.data.data;
  }

  /**
   * Get list with filters
   */
  async getList(doctype, filters = {}, fields = ['*'], limit = 100) {
    const response = await this.axiosInstance.get(`/api/resource/${doctype}`, {
      params: {
        filters: JSON.stringify(filters),
        fields: JSON.stringify(fields),
        limit_page_length: limit
      }
    });
    return response.data.data;
  }

  /**
   * Call server-side method (RPC)
   */
  async call(method, args = {}) {
    const response = await this.axiosInstance.post(`/api/method/${method}`, args);
    return response.data;
  }

  // ==================== Accounting Methods ====================

  /**
   * Upsert Account (Chart of Accounts)
   */
  async upsertAccount(xeroAccount) {
    const existing = await this.getList('Account', {
      account_number: xeroAccount.Code?.toString()
    }, ['name', 'account_number'], 1);

    const accountData = {
      account_name: xeroAccount.Name,
      account_number: xeroAccount.Code?.toString(),
      account_type: this.mapAccountType(xeroAccount.Type),
      parent_account: this.mapParentAccount(xeroAccount.Type),
      currency: 'USD',
      is_group: xeroAccount.Type === 'BANK' ? 0 : 1
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Account', existing[0].name, accountData);
    } else {
      return await this.createDoc('Account', accountData);
    }
  }

  /**
   * Map Xero account types to ERPNext account types
   */
  mapAccountType(xeroType) {
    const mapping = {
      'BANK': 'Bank',
      'CURRENT': 'Asset',
      'CURRLIAB': 'Liability',
      'DEPRECIATN': 'Depreciation',
      'DIRECTCOSTS': 'Direct Income',
      'EXPENSE': 'Expense',
      'LIABILITY': 'Liability',
      'NONCURRENT': 'Asset',
      'OTHERINCOME': 'Other Income',
      'OVERHEAD': 'Expense',
      'PREPAYMENT': 'Asset',
      'REVENUE': 'Income',
      'SALARYWAGES': 'Expense',
      'TERMLIAB': 'Liability',
      'PAYGLIABILITY': 'Liability'
    };
    return mapping[xeroType] || 'Asset';
  }

  /**
   * Map Xero account types to ERPNext parent accounts
   */
  mapParentAccount(xeroType) {
    const mapping = {
      'BANK': 'Bank Accounts',
      'CURRENT': 'Current Assets',
      'CURRLIAB': 'Current Liabilities',
      'EXPENSE': 'Direct Expenses',
      'LIABILITY': 'Current Liabilities',
      'NONCURRENT': 'Fixed Assets',
      'REVENUE': 'Direct Income',
      'OVERHEAD': 'Indirect Expenses'
    };
    return mapping[xeroType] || 'Application of Funds (Assets)';
  }

  /**
   * Upsert Party (Customer/Supplier) from Xero Contact
   */
  async upsertParty(xeroContact) {
    // Check if exists
    const existing = await this.getList('Customer', {
      xero_contact_id: xeroContact.ContactID
    }, ['name'], 1);

    const partyData = {
      customer_name: xeroContact.Name,
      xero_contact_id: xeroContact.ContactID,
      customer_type: xeroContact.IsSupplier ? 'Both' : 'Individual',
      email_id: xeroContact.EmailAddresses?.[0]?.EmailAddress,
      phone: xeroContact.Phones?.[0]?.PhoneNumber,
      addresses: [{
        address_line1: xeroContact.Address?.AddressLine1,
        address_line2: xeroContact.Address?.AddressLine2,
        city: xeroContact.Address?.City,
        state: xeroContact.Address?.Region,
        country: xeroContact.Address?.Country,
        pincode: xeroContact.Address?.PostalCode
      }]
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Customer', existing[0].name, partyData);
    } else {
      return await this.createDoc('Customer', partyData);
    }
  }

  /**
   * Upsert Supplier from Precoro Vendor
   */
  async upsertSupplier(precoroVendor) {
    const existing = await this.getList('Supplier', {
      precoro_vendor_id: precoroVendor.id.toString()
    }, ['name'], 1);

    const supplierData = {
      supplier_name: precoroVendor.name,
      precoro_vendor_id: precoroVendor.id.toString(),
      supplier_type: 'Company',
      email: precoroVendor.email,
      phone: precoroVendor.phone,
      website: precoroVendor.website,
      tax_id: precoroVendor.tax_number,
      addresses: [{
        address_line1: precoroVendor.address,
        city: precoroVendor.city,
        state: precoroVendor.state,
        country: precoroVendor.country,
        pincode: precoroVendor.postal_code
      }]
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Supplier', existing[0].name, supplierData);
    } else {
      return await this.createDoc('Supplier', supplierData);
    }
  }

  /**
   * Upsert Invoice from Xero
   */
  async upsertInvoice(xeroInvoice) {
    const existing = await this.getList('Sales Invoice', {
      xero_invoice_id: xeroInvoice.InvoiceID
    }, ['name'], 1);

    const invoiceData = {
      xero_invoice_id: xeroInvoice.InvoiceID,
      customer: await this.getCustomerByXeroId(xeroInvoice.Contact.ContactID),
      posting_date: xeroInvoice.Date?.split('T')[0],
      due_date: xeroInvoice.DueDate?.split('T')[0],
      status: this.mapInvoiceStatus(xeroInvoice.Status),
      items: xeroInvoice.LineItems?.map(item => ({
        item_code: item.Description,
        qty: item.Quantity,
        rate: item.UnitAmount,
        amount: item.LineAmount
      })),
      taxes: xeroInvoice.LineAmountTypes === 'Exclusive' ? this.mapTaxes(xeroInvoice.LineItems) : [],
      remarks: xeroInvoice.Reference
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Sales Invoice', existing[0].name, invoiceData);
    } else {
      return await this.createDoc('Sales Invoice', invoiceData);
    }
  }

  /**
   * Upsert Bill from Xero
   */
  async upsertBill(xeroBill) {
    const existing = await this.getList('Purchase Invoice', {
      xero_invoice_id: xeroBill.InvoiceID
    }, ['name'], 1);

    const billData = {
      xero_invoice_id: xeroBill.InvoiceID,
      supplier: await this.getSupplierByXeroId(xeroBill.Contact.ContactID),
      posting_date: xeroBill.Date?.split('T')[0],
      due_date: xeroBill.DueDate?.split('T')[0],
      status: this.mapInvoiceStatus(xeroBill.Status),
      items: xeroBill.LineItems?.map(item => ({
        item_code: item.Description,
        qty: item.Quantity,
        rate: item.UnitAmount,
        amount: item.LineAmount
      })),
      remarks: xeroBill.Reference
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Purchase Invoice', existing[0].name, billData);
    } else {
      return await this.createDoc('Purchase Invoice', billData);
    }
  }

  /**
   * Upsert Payment from Xero
   */
  async upsertPayment(xeroPayment) {
    const existing = await this.getList('Payment Entry', {
      xero_payment_id: xeroPayment.PaymentID
    }, ['name'], 1);

    const paymentData = {
      xero_payment_id: xeroPayment.PaymentID,
      payment_type: xeroPayment.Type === 'RECEIVE' ? 'Receive' : 'Pay',
      posting_date: xeroPayment.Date?.split('T')[0],
      paid_amount: xeroPayment.Amount,
      reference_no: xeroPayment.Reference,
      remarks: xeroPayment.Reference
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Payment Entry', existing[0].name, paymentData);
    } else {
      return await this.createDoc('Payment Entry', paymentData);
    }
  }

  /**
   * Upsert Purchase Order from Precoro
   */
  async upsertPurchaseOrder(precoroPO) {
    const existing = await this.getList('Purchase Order', {
      precoro_po_id: precoroPO.id.toString()
    }, ['name'], 1);

    const poData = {
      precoro_po_id: precoroPO.id.toString(),
      supplier: await this.getSupplierByPrecoroId(precoroPO.vendor?.id),
      transaction_date: precoroPO.created_at?.split('T')[0],
      delivery_date: precoroPO.delivery_date?.split('T')[0],
      status: this.mapPOStatus(precoroPO.status),
      items: precoroPO.items?.map(item => ({
        item_code: item.name || item.description,
        qty: item.quantity,
        rate: item.unit_price,
        amount: item.total_price
      })),
      total: precoroPO.total,
      remarks: precoroPO.notes
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Purchase Order', existing[0].name, poData);
    } else {
      return await this.createDoc('Purchase Order', poData);
    }
  }

  /**
   * Upsert Purchase Receipt from Precoro Shipment
   */
  async upsertPurchaseReceipt(precoroShipment) {
    const existing = await this.getList('Purchase Receipt', {
      precoro_shipment_id: precoroShipment.id.toString()
    }, ['name'], 1);

    const receiptData = {
      precoro_shipment_id: precoroShipment.id.toString(),
      supplier: await this.getSupplierByPrecoroId(precoroShipment.vendor?.id),
      posting_date: precoroShipment.shipped_at?.split('T')[0],
      items: precoroShipment.items?.map(item => ({
        item_code: item.name || item.description,
        qty: item.quantity,
        rate: item.unit_price,
        amount: item.total_price
      })),
      remarks: precoroShipment.tracking_number
    };

    if (existing && existing.length > 0) {
      return await this.updateDoc('Purchase Receipt', existing[0].name, receiptData);
    } else {
      return await this.createDoc('Purchase Receipt', receiptData);
    }
  }

  // ==================== Helper Methods ====================

  async getCustomerByXeroId(xeroContactId) {
    const customers = await this.getList('Customer', {
      xero_contact_id: xeroContactId
    }, ['name'], 1);
    return customers?.[0]?.name || 'Customer';
  }

  async getSupplierByXeroId(xeroContactId) {
    const suppliers = await this.getList('Supplier', {
      xero_contact_id: xeroContactId
    }, ['name'], 1);
    return suppliers?.[0]?.name || 'Supplier';
  }

  async getSupplierByPrecoroId(precoroVendorId) {
    const suppliers = await this.getList('Supplier', {
      precoro_vendor_id: precoroVendorId.toString()
    }, ['name'], 1);
    return suppliers?.[0]?.name || 'Supplier';
  }

  mapInvoiceStatus(xeroStatus) {
    const mapping = {
      'DRAFT': 'Draft',
      'SUBMITTED': 'Submitted',
      'AUTHORISED': 'Paid',
      'PAID': 'Paid',
      'VOIDED': 'Cancelled'
    };
    return mapping[xeroStatus] || 'Draft';
  }

  mapPOStatus(precoroStatus) {
    const mapping = {
      'draft': 'Draft',
      'pending_approval': 'To Approve',
      'approved': 'To Receive',
      'received': 'To Bill',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return mapping[precoroStatus] || 'Draft';
  }

  mapTaxes(lineItems) {
    // Simplified tax mapping
    return lineItems
      .filter(item => item.TaxAmount > 0)
      .map(item => ({
        charge_type: 'On Net Total',
        account_head: 'Output Tax - VAT',
        tax_amount: item.TaxAmount,
        description: item.Name
      }));
  }
}

module.exports = ERPNextClient;
