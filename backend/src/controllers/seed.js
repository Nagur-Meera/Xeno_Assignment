const prisma = require('../utils/prisma');

/**
 * Seed demo data for testing
 */
const seedDemoData = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Create demo customers
    const customers = await Promise.all([
      prisma.customer.create({
        data: {
          shopifyCustomerId: '1001',
          tenantId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          totalSpent: 450.00,
          ordersCount: 3
        }
      }),
      prisma.customer.create({
        data: {
          shopifyCustomerId: '1002',
          tenantId,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          totalSpent: 750.00,
          ordersCount: 5
        }
      }),
      prisma.customer.create({
        data: {
          shopifyCustomerId: '1003',
          tenantId,
          firstName: 'Bob',
          lastName: 'Johnson',
          email: 'bob.johnson@example.com',
          phone: '+1234567892',
          totalSpent: 320.00,
          ordersCount: 2
        }
      }),
      prisma.customer.create({
        data: {
          shopifyCustomerId: '1004',
          tenantId,
          firstName: 'Alice',
          lastName: 'Brown',
          email: 'alice.brown@example.com',
          phone: '+1234567893',
          totalSpent: 890.00,
          ordersCount: 7
        }
      }),
      prisma.customer.create({
        data: {
          shopifyCustomerId: '1005',
          tenantId,
          firstName: 'Charlie',
          lastName: 'Wilson',
          email: 'charlie.wilson@example.com',
          phone: '+1234567894',
          totalSpent: 1200.00,
          ordersCount: 10
        }
      })
    ]);

    // Create demo products
    const products = await Promise.all([
      prisma.product.create({
        data: {
          shopifyProductId: '2001',
          tenantId,
          title: 'Premium Wireless Headphones',
          handle: 'premium-wireless-headphones',
          price: 199.99,
          compareAtPrice: 249.99,
          vendor: 'TechCorp',
          productType: 'Electronics',
          status: 'active'
        }
      }),
      prisma.product.create({
        data: {
          shopifyProductId: '2002',
          tenantId,
          title: 'Organic Cotton T-Shirt',
          handle: 'organic-cotton-t-shirt',
          price: 29.99,
          vendor: 'EcoWear',
          productType: 'Clothing',
          status: 'active'
        }
      }),
      prisma.product.create({
        data: {
          shopifyProductId: '2003',
          tenantId,
          title: 'Smart Fitness Watch',
          handle: 'smart-fitness-watch',
          price: 299.99,
          compareAtPrice: 399.99,
          vendor: 'FitTech',
          productType: 'Electronics',
          status: 'active'
        }
      }),
      prisma.product.create({
        data: {
          shopifyProductId: '2004',
          tenantId,
          title: 'Eco-Friendly Water Bottle',
          handle: 'eco-friendly-water-bottle',
          price: 24.99,
          vendor: 'GreenLife',
          productType: 'Accessories',
          status: 'active'
        }
      }),
      prisma.product.create({
        data: {
          shopifyProductId: '2005',
          tenantId,
          title: 'Bluetooth Speaker',
          handle: 'bluetooth-speaker',
          price: 79.99,
          compareAtPrice: 99.99,
          vendor: 'AudioMax',
          productType: 'Electronics',
          status: 'active'
        }
      })
    ]);

    // Create demo orders with different dates for trends
    const now = new Date();
    const orders = [];

    // Orders from last 30 days
    for (let i = 0; i < 20; i++) {
      const orderDate = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const totalPrice = parseFloat((product.price * quantity).toFixed(2));

      const order = await prisma.order.create({
        data: {
          shopifyOrderId: `3${1000 + i}`,
          tenantId,
          customerId: customer.id,
          orderNumber: `XA-${1000 + i}`,
          totalPrice,
          subtotalPrice: totalPrice * 0.9,
          totalTax: totalPrice * 0.1,
          currency: 'USD',
          financialStatus: Math.random() > 0.2 ? 'paid' : 'pending',
          fulfillmentStatus: Math.random() > 0.3 ? 'fulfilled' : 'unfulfilled',
          orderDate
        }
      });

      // Create order items
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          title: product.title,
          quantity,
          price: product.price
        }
      });

      orders.push(order);
    }

    // Create some events
    const events = [];
    for (let i = 0; i < 10; i++) {
      const eventDate = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const customer = customers[Math.floor(Math.random() * customers.length)];
      
      const event = await prisma.event.create({
        data: {
          tenantId,
          customerId: customer.id,
          eventType: ['cart_abandoned', 'checkout_started', 'product_viewed'][Math.floor(Math.random() * 3)],
          eventData: JSON.stringify({
            timestamp: eventDate,
            products: [products[Math.floor(Math.random() * products.length)].title]
          }),
          createdAt: eventDate
        }
      });

      events.push(event);
    }

    res.json({
      message: 'Demo data seeded successfully',
      data: {
        customers: customers.length,
        products: products.length,
        orders: orders.length,
        events: events.length
      }
    });

  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
};

/**
 * Clear all data for tenant
 */
const clearTenantData = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Delete in order due to foreign key constraints
    await prisma.orderItem.deleteMany({
      where: { order: { tenantId } }
    });

    await prisma.order.deleteMany({
      where: { tenantId }
    });

    await prisma.event.deleteMany({
      where: { tenantId }
    });

    await prisma.customer.deleteMany({
      where: { tenantId }
    });

    await prisma.product.deleteMany({
      where: { tenantId }
    });

    res.json({
      message: 'Tenant data cleared successfully'
    });

  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: 'Failed to clear tenant data' });
  }
};

module.exports = {
  seedDemoData,
  clearTenantData
};