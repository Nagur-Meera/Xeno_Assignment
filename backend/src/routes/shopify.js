const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  testConnection,
  syncCustomers,
  syncOrders,
  syncProducts,
  getShopInfo
} = require('../controllers/shopify');

const router = express.Router();

// All Shopify routes require authentication
router.use(authenticateToken);

// Test Shopify connection
router.post('/test-connection', testConnection);

// Get shop information
router.get('/shop-info', getShopInfo);

// Data sync endpoints
router.post('/sync/customers', syncCustomers);
router.post('/sync/orders', syncOrders);
router.post('/sync/products', syncProducts);

module.exports = router;