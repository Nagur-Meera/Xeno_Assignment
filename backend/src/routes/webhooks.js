const express = require('express');
const {
  handleCustomerWebhook,
  handleOrderWebhook,
  handleProductWebhook
} = require('../controllers/webhooks');

const router = express.Router();

// Shopify webhook endpoints
router.post('/shopify/customers/create', handleCustomerWebhook);
router.post('/shopify/customers/update', handleCustomerWebhook);

router.post('/shopify/orders/create', handleOrderWebhook);
router.post('/shopify/orders/updated', handleOrderWebhook);
router.post('/shopify/orders/paid', handleOrderWebhook);

router.post('/shopify/products/create', handleProductWebhook);
router.post('/shopify/products/update', handleProductWebhook);

// Test webhook endpoint
router.post('/test', (req, res) => {
  console.log('Test webhook received:', req.headers);
  console.log('Body:', req.body);
  res.json({ message: 'Webhook received', timestamp: new Date().toISOString() });
});

module.exports = router;