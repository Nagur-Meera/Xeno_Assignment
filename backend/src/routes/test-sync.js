const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { syncCustomers, syncOrders, syncProducts } = require('../controllers/shopify');

const router = express.Router();
const prisma = new PrismaClient();

// Test sync endpoint without authentication (for development only)
router.post('/test-sync/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    // Get the first user for testing
    const user = await prisma.user.findFirst({
      include: { tenant: true }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'No user found in database' });
    }
    
    // Mock request object
    const mockReq = {
      user: user,
      tenantId: user.tenantId
    };
    
    // Call the appropriate sync function
    switch (type) {
      case 'customers':
        await syncCustomers(mockReq, res);
        break;
      case 'products':
        await syncProducts(mockReq, res);
        break;
      case 'orders':
        await syncOrders(mockReq, res);
        break;
      default:
        res.status(400).json({ error: 'Invalid sync type. Use: customers, products, or orders' });
    }
  } catch (error) {
    console.error('Test sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
router.get('/status', async (req, res) => {
  try {
    // Get the first user for testing
    const user = await prisma.user.findFirst({
      include: { tenant: true }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'No user found in database' });
    }
    
    const customerCount = await prisma.customer.count({
      where: { tenantId: user.tenantId }
    });
    
    const productCount = await prisma.product.count({
      where: { tenantId: user.tenantId }
    });
    
    const orderCount = await prisma.order.count({
      where: { tenantId: user.tenantId }
    });
    
    res.json({
      tenant: user.tenant.name,
      shopifyDomain: user.tenant.shopifyDomain,
      hasToken: !!user.tenant.shopifyAccessToken,
      data: {
        customers: customerCount,
        products: productCount,
        orders: orderCount
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test analytics without auth
router.get('/analytics', async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      include: { tenant: true }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'No user found in database' });
    }
    
    const tenantId = user.tenantId;
    
    // Get overview data
    const [
      totalCustomers,
      totalOrders,
      totalProducts,
      revenueData
    ] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId },
        _sum: { totalPrice: true },
        _avg: { totalPrice: true }
      })
    ]);
    
    const totalRevenue = revenueData._sum.totalPrice || 0;
    const averageOrderValue = revenueData._avg.totalPrice || 0;
    
    // Get top customers
    const topCustomers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { totalSpent: 'desc' },
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        totalSpent: true,
        ordersCount: true
      }
    });
    
    // Get revenue trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueTrends = await prisma.$queryRaw`
      SELECT 
        DATE(orderDate) as date,
        CAST(SUM(totalPrice) as DECIMAL(10,2)) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE tenantId = ${tenantId} 
        AND orderDate >= ${thirtyDaysAgo}
      GROUP BY DATE(orderDate) 
      ORDER BY date
    `;
    
    // Convert BigInt values to regular numbers
    const processedTrends = revenueTrends.map(trend => ({
      date: trend.date,
      revenue: parseFloat(trend.revenue),
      orders: Number(trend.orders)
    }));
    
    res.json({
      user: {
        email: user.email,
        tenant: user.tenant.name
      },
      overview: {
        totalCustomers,
        totalOrders,
        totalProducts,
        totalRevenue: parseFloat(totalRevenue),
        averageOrderValue: parseFloat(averageOrderValue)
      },
      topCustomers,
      revenueTrends: processedTrends
    });
    
  } catch (error) {
    console.error('Analytics test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to test what data a specific user should see
router.get('/debug-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tenantId = user.tenantId;
    
    const [customerCount, orderCount, productCount] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } })
    ]);
    
    res.json({
      user: {
        email: user.email,
        name: user.name,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          domain: user.tenant.shopifyDomain
        }
      },
      expectedData: {
        customers: customerCount,
        orders: orderCount,
        products: productCount,
        shouldSeeData: orderCount > 0 || customerCount > 0
      },
      message: orderCount > 0 || customerCount > 0 
        ? 'This user should see real analytics data' 
        : 'This user should see empty states (no data)'
    });
    
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;