const express = require('express');
const router = express.Router();
const XeroClient = require('../clients/xero');
const ERPNextClient = require('../clients/erpnext');

/**
 * Xero Integration Routes
 */

const xero = new XeroClient();
const erpNext = new ERPNextClient();

/**
 * GET /api/xero/accounts
 * Get accounts from Xero
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await xero.getAccounts();
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/xero/invoices
 * Get invoices from Xero
 */
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await xero.getInvoices(req.query);
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/xero/invoices
 * Create invoice in Xero
 */
router.post('/invoices', async (req, res) => {
  try {
    const invoice = await xero.createInvoice(req.body);
    res.json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/xero/contacts
 * Get contacts from Xero
 */
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await xero.getContacts(req.query);
    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/xero/contacts
 * Create/update contact in Xero
 */
router.post('/contacts', async (req, res) => {
  try {
    const contact = await xero.upsertContact(req.body);
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/xero/bills
 * Get bills from Xero
 */
router.get('/bills', async (req, res) => {
  try {
    const bills = await xero.getBills(req.query);
    res.json({ success: true, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/xero/bills
 * Create bill in Xero
 */
router.post('/bills', async (req, res) => {
  try {
    const bill = await xero.createBill(req.body);
    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/xero/sync
 * Trigger full Xero to ERPNext sync
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await xero.syncToERPNext(erpNext, req.body.options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
