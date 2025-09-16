const express = require('express');
const { authenticateToken, ensureTenantAccess } = require('../middleware/auth');
const {
  getOverview,
  getRevenueTrends,
  getTopCustomers,
  getOrdersAnalytics,
  getProductPerformance
} = require('../controllers/analytics');

const router = express.Router();

// All API routes require authentication
router.use(authenticateToken);
router.use(ensureTenantAccess);

// Analytics endpoints
router.get('/analytics/overview', getOverview);
router.get('/analytics/revenue-trends', getRevenueTrends);
router.get('/analytics/top-customers', getTopCustomers);
router.get('/analytics/orders', getOrdersAnalytics);
router.get('/analytics/products', getProductPerformance);

// Tenant info endpoint
router.get('/tenant', (req, res) => {
  res.json({
    tenant: {
      id: req.user.tenant.id,
      name: req.user.tenant.name,
      shopifyDomain: req.user.tenant.shopifyDomain,
      isActive: req.user.tenant.isActive
    }
  });
});

module.exports = router;