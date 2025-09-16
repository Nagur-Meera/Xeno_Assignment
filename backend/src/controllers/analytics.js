const prisma = require('../utils/prisma');

/**
 * Get dashboard overview metrics
 */
const getOverview = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    console.log('[Analytics][getOverview] tenantId:', tenantId);

    // Get counts and totals
    const [
      totalCustomers,
      totalOrders,
      totalProducts,
      revenueData
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { tenantId }
      }),

      // Total orders
      prisma.order.count({
        where: { tenantId }
      }),

      // Total products
      prisma.product.count({
        where: { tenantId }
      }),

      // Revenue calculations
      prisma.order.aggregate({
        where: { 
          tenantId,
          financialStatus: 'paid'
        },
        _sum: {
          totalPrice: true
        },
        _avg: {
          totalPrice: true
        }
      })
    ]);

    const totalRevenue = revenueData._sum.totalPrice || 0;
    const averageOrderValue = revenueData._avg.totalPrice || 0;

    // Get additional data for dashboard
    // Revenue trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const revenueTrends = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(orderDate, '%b') as name,
        CAST(SUM(totalPrice) as DECIMAL(10,2)) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE tenantId = ${tenantId} 
        AND orderDate >= ${thirtyDaysAgo}
      GROUP BY DATE_FORMAT(orderDate, '%Y-%m'), DATE_FORMAT(orderDate, '%b')
      ORDER BY DATE_FORMAT(orderDate, '%Y-%m')
    `;

    // Top customers for segmentation
    const topCustomers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { totalSpent: 'desc' },
      take: 10
    });

    // Customer segmentation (simplified)
    let customerSegmentation = [];
    if (totalCustomers > 0) {
      const vipCustomers = topCustomers.filter(c => parseFloat(c.totalSpent) > 500).length;
      const regularCustomers = totalCustomers - vipCustomers;
      
      customerSegmentation = [
        { name: 'New Customers', value: Math.round(regularCustomers * 0.6), fill: '#8884d8' },
        { name: 'Returning Customers', value: Math.round(regularCustomers * 0.4), fill: '#82ca9d' },
        { name: 'VIP Customers', value: vipCustomers, fill: '#ffc658' }
      ].filter(seg => seg.value > 0);
    }

    // Top products by revenue
    const topProductsData = await prisma.$queryRaw`
      SELECT 
        p.title as name,
        COUNT(oi.id) as sales,
        CAST(SUM(oi.price * oi.quantity) as DECIMAL(10,2)) as revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE p.tenantId = ${tenantId}
        AND o.tenantId = ${tenantId}
      GROUP BY p.id, p.title
      HAVING sales > 0
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // Process BigInt values
    const processedRevenueTrends = revenueTrends.map(trend => ({
      name: trend.name,
      revenue: parseFloat(trend.revenue || 0),
      orders: Number(trend.orders || 0)
    }));

    const processedTopProducts = topProductsData.map(product => ({
      name: product.name,
      sales: Number(product.sales || 0),
      revenue: parseFloat(product.revenue || 0)
    }));

    res.json({
      overview: {
        totalCustomers,
        totalOrders,
        totalProducts,
        totalRevenue: parseFloat(totalRevenue),
        averageOrderValue: parseFloat(averageOrderValue)
      },
      revenueData: processedRevenueTrends,
      customerSegmentation,
      topProducts: processedTopProducts
    });

    console.log('[Analytics][getOverview] result:', {
      totalCustomers,
      totalOrders,
      totalProducts,
      totalRevenue: parseFloat(totalRevenue),
      averageOrderValue: parseFloat(averageOrderValue),
      revenueDataCount: processedRevenueTrends.length,
      customerSegmentationCount: customerSegmentation.length,
      topProductsCount: processedTopProducts.length
    });

  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
};

/**
 * Get revenue trends over time
 */
const getRevenueTrends = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate, interval = 'day' } = req.query;

    console.log('[Analytics][getRevenueTrends] tenantId:', tenantId, 'interval:', interval);

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Build date format based on interval
    let dateFormat;
    switch (interval) {
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    // Raw SQL query for better date grouping
    const revenueData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(orderDate, ${dateFormat}) as date,
        COUNT(*) as orderCount,
        SUM(totalPrice) as revenue
      FROM orders 
      WHERE tenantId = ${tenantId}
        AND orderDate >= ${start}
        AND orderDate <= ${end}
        AND financialStatus = 'paid'
      GROUP BY DATE_FORMAT(orderDate, ${dateFormat})
      ORDER BY date ASC
    `;

    const formattedData = revenueData.map(item => ({
      date: item.date,
      revenue: parseFloat(item.revenue),
      orderCount: parseInt(item.orderCount)
    }));

    res.json({
      trends: formattedData,
      period: { startDate: start, endDate: end, interval }
    });

    console.log('[Analytics][getRevenueTrends] result count:', formattedData.length);

  } catch (error) {
    console.error('Get revenue trends error:', error);
    res.status(500).json({ error: 'Failed to get revenue trends' });
  }
};

/**
 * Get top customers by spend
 */
const getTopCustomers = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 5;

    console.log('[Analytics][getTopCustomers] tenantId:', tenantId, 'limit:', limit);

    const topCustomers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: {
        totalSpent: 'desc'
      },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        totalSpent: true,
        ordersCount: true,
        createdAt: true
      }
    });

    const formattedCustomers = topCustomers.map(customer => ({
      ...customer,
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email,
      totalSpent: parseFloat(customer.totalSpent)
    }));

    res.json({
      topCustomers: formattedCustomers
    });

    console.log('[Analytics][getTopCustomers] result count:', formattedCustomers.length);

  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({ error: 'Failed to get top customers' });
  }
};

/**
 * Get orders analytics
 */
const getOrdersAnalytics = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;

    console.log('[Analytics][getOrdersAnalytics] tenantId:', tenantId);

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      ordersByStatus,
      recentOrders
    ] = await Promise.all([
      // Orders by status
      prisma.order.groupBy({
        by: ['financialStatus'],
        where: {
          tenantId,
          orderDate: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalPrice: true
        }
      }),

      // Recent orders
      prisma.order.findMany({
        where: {
          tenantId,
          orderDate: {
            gte: start,
            lte: end
          }
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          orderDate: 'desc'
        },
        take: 10
      })
    ]);

    const statusData = ordersByStatus.map(item => ({
      status: item.financialStatus,
      count: item._count.id,
      revenue: parseFloat(item._sum.totalPrice || 0)
    }));

    const formattedOrders = recentOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalPrice: parseFloat(order.totalPrice),
      financialStatus: order.financialStatus,
      orderDate: order.orderDate,
      customer: order.customer ? {
        name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email,
        email: order.customer.email
      } : null
    }));

    res.json({
      ordersByStatus: statusData,
      recentOrders: formattedOrders,
      period: { startDate: start, endDate: end }
    });

    console.log('[Analytics][getOrdersAnalytics] result:', {
      ordersByStatusCount: statusData.length,
      recentOrdersCount: formattedOrders.length
    });

  } catch (error) {
    console.error('Get orders analytics error:', error);
    res.status(500).json({ error: 'Failed to get orders analytics' });
  }
};

/**
 * Get product performance
 */
const getProductPerformance = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 10;

    console.log('[Analytics][getProductPerformance] tenantId:', tenantId, 'limit:', limit);

    // Get top selling products
    const topProducts = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.title,
        p.price,
        p.vendor,
        COALESCE(SUM(oi.quantity), 0) as totalSold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as totalRevenue,
        COUNT(DISTINCT CASE WHEN o.financialStatus = 'paid' THEN o.id END) as orderCount
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id AND o.tenantId = ${tenantId}
      WHERE p.tenantId = ${tenantId}
      GROUP BY p.id, p.title, p.price, p.vendor
      ORDER BY totalSold DESC
      LIMIT ${limit}
    `;

    const formattedProducts = topProducts.map(product => ({
      id: product.id,
      title: product.title,
      price: parseFloat(product.price),
      vendor: product.vendor,
      totalSold: parseInt(product.totalSold || 0),
      totalRevenue: parseFloat(product.totalRevenue || 0),
      orderCount: parseInt(product.orderCount || 0)
    }));

    res.json({
      topProducts: formattedProducts
    });

    console.log('[Analytics][getProductPerformance] result count:', formattedProducts.length);

  } catch (error) {
    console.error('Get product performance error:', error);
    res.status(500).json({ error: 'Failed to get product performance' });
  }
};

module.exports = {
  getOverview,
  getRevenueTrends,
  getTopCustomers,
  getOrdersAnalytics,
  getProductPerformance
};