const express = require('express');
const { seedDemoData, clearTenantData } = require('../controllers/seed');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Seed demo data
router.post('/seed', authenticateToken, seedDemoData);

// Clear tenant data
router.delete('/clear', authenticateToken, clearTenantData);

module.exports = router;