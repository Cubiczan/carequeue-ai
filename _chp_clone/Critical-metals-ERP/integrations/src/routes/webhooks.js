const express = require('express');
const router = express.Router();
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: 'Webhooks' }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

/**
 * Webhook Routes
 * 
 * Receive webhooks from external systems:
 * - Xero: Invoice/Bill/Payment events
 * - Precoro: PO status changes
 * - Carbon: Production events
 */

/**
 * POST /api/webhooks/xero
 * Xero webhook handler
 */
router.post('/xero', async (req, res) => {
  try {
    const { event, resource } = req.body;
    
    logger.info('Received Xero webhook', { event, resourceId: resource?.id });

    // Validate webhook signature (implement based on Xero docs)
    // const isValid = validateXeroWebhook(req);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    // Process event
    switch (event) {
      case 'INVOICE_CREATED':
      case 'INVOICE_UPDATED':
        // Trigger invoice sync
        logger.info('Triggering invoice sync for', resource?.id);
        break;
      
      case 'PAYMENT_CREATED':
        // Trigger payment sync
        logger.info('Triggering payment sync for', resource?.id);
        break;
      
      case 'CONTACT_CREATED':
      case 'CONTACT_UPDATED':
        // Trigger contact sync
        logger.info('Triggering contact sync for', resource?.id);
        break;
      
      default:
        logger.info('Unhandled Xero event type', event);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    logger.error('Xero webhook error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/precoro
 * Precoro webhook handler
 */
router.post('/precoro', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    logger.info('Received Precoro webhook', { event, documentId: data?.id });

    // Validate webhook signature
    // const isValid = validatePrecoroWebhook(req);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    // Process event
    switch (event) {
      case 'document.approved':
        // Sync approved PO to ERPNext
        logger.info('Syncing approved PO to ERPNext', data?.id);
        break;
      
      case 'document.received':
        // Create purchase receipt in ERPNext
        logger.info('Creating purchase receipt for', data?.id);
        break;
      
      case 'vendor.created':
      case 'vendor.updated':
        // Sync vendor to ERPNext
        logger.info('Syncing vendor to ERPNext', data?.id);
        break;
      
      default:
        logger.info('Unhandled Precoro event type', event);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    logger.error('Precoro webhook error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/carbon
 * Carbon webhook handler
 */
router.post('/carbon', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    logger.info('Received Carbon webhook', { event, orderId: data?.id });

    // Validate webhook signature
    // const isValid = validateCarbonWebhook(req);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    // Process event
    switch (event) {
      case 'production_order.completed':
        // Sync production results to ERPNext
        logger.info('Syncing completed production order to ERPNext', data?.id);
        break;
      
      case 'work_order.completed':
        // Update work order status in ERPNext
        logger.info('Updating work order status in ERPNext', data?.id);
        break;
      
      case 'quality_inspection.completed':
        // Sync quality inspection to ERPNext
        logger.info('Syncing quality inspection to ERPNext', data?.id);
        break;
      
      case 'batch.created':
        // Record batch in ERPNext if needed
        logger.info('Recording new batch', data?.id);
        break;
      
      case 'material.consumed':
        // Sync material consumption to ERPNext
        logger.info('Syncing material consumption to ERPNext', data?.id);
        break;
      
      default:
        logger.info('Unhandled Carbon event type', event);
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    logger.error('Carbon webhook error', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/test
 * Test webhook endpoint
 */
router.post('/test', (req, res) => {
  logger.info('Test webhook received', req.body);
  res.json({ 
    success: true, 
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    body: req.body
  });
});

module.exports = router;
