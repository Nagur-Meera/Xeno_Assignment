const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Routes
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const apiRoutes = require('./routes/api');
const seedRoutes = require('./routes/seed');
const shopifyRoutes = require('./routes/shopify');
const testSyncRoutes = require('./routes/test-sync');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use('/webhooks', express.raw({ type: 'application/json' })); // Raw for webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Xeno Shopify Analytics API'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/test-sync', testSyncRoutes); // Put before authenticated routes
app.use('/api', apiRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/shopify', shopifyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Xeno Analytics API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;