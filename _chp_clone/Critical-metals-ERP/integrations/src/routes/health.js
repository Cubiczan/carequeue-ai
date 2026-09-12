const express = require('express');
const router = express.Router();

/**
 * Health Check Routes
 */

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      xero: process.env.XERO_CLIENT_ID ? 'configured' : 'not configured',
      precoro: process.env.PRECORO_API_KEY ? 'configured' : 'not configured',
      erpnext: process.env.ERPNext_API_KEY ? 'configured' : 'not configured',
      carbon: process.env.CARBON_API_KEY ? 'configured' : 'not configured'
    }
  });
});

router.get('/xero', async (req, res) => {
  try {
    const XeroClient = require('../clients/xero');
    const client = new XeroClient();
    await client.authenticate();
    res.json({ status: 'healthy', service: 'xero' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', service: 'xero', error: error.message });
  }
});

router.get('/precoro', async (req, res) => {
  try {
    const PrecoroClient = require('../clients/precoro');
    const client = new PrecoroClient();
    await client.getVendors({ limit: 1 });
    res.json({ status: 'healthy', service: 'precoro' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', service: 'precoro', error: error.message });
  }
});

router.get('/erpnext', async (req, res) => {
  try {
    const ERPNextClient = require('../clients/erpnext');
    const client = new ERPNextClient();
    await client.getDoc('Company', 'Company');
    res.json({ status: 'healthy', service: 'erpnext' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', service: 'erpnext', error: error.message });
  }
});

router.get('/carbon', async (req, res) => {
  try {
    const CarbonClient = require('../clients/carbon');
    const client = new CarbonClient();
    await client.getWorkOrders({ limit: 1 });
    res.json({ status: 'healthy', service: 'carbon' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', service: 'carbon', error: error.message });
  }
});

module.exports = router;
