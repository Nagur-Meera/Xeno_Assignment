const prisma = require('../utils/prisma');

/**
 * Seed sample data for development and testing
 */
const seedSampleData = async (tenantId) => {
  try {
    console.log(`🌱 Seeding sample data for tenant: ${tenantId}`);

    // Sample customers
    const customers = [
      {
        shopifyCustomerId: '1001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        totalSpent: 850.50,
        ordersCount: 3
      },
      {
        shopifyCustomerId: '1002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        totalSpent: 1250.75,
        ordersCount: 5
      },
      {
        shopifyCustomerId: '1003',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        phone: '+1234567892',
        totalSpent: 650.25,
        ordersCount: 2
      },
      {
        shopifyCustomerId: '1004',
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice.brown@example.com',
        phone: '+1234567893',
        totalSpent: 2100.00,
        ordersCount: 8
      },
      {
        shopifyCustomerId: '1005',
        firstName: 'Charlie',
        lastName: 'Wilson',
        email: 'charlie.wilson@example.com',
        phone: '+1234567894',
        totalSpent: 480.30,
        ordersCount: 1
      }
    ];

    // Sample products
    const products = [
      {
        shopifyProductId: '2001',
        title: 'Premium T-Shirt',
        handle: 'premium-t-shirt',
        price: 29.99,
        vendor: 'Fashion Co',
        productType: 'Apparel',
        status: 'active'
      },
      {
        shopifyProductId: '2002',
        title: 'Wireless Headphones',
        handle: 'wireless-headphones',
        price: 199.99,
        vendor: 'Tech Corp',
        productType: 'Electronics',
        status: 'active'
      },
      {
        shopifyProductId: '2003',
        title: 'Coffee Mug',
        handle: 'coffee-mug',
        price: 15.99,
        vendor: 'Home Goods',
        productType: 'Kitchen',
        status: 'active'
      },
      {
        shopifyProductId: '2004',
        title: 'Running Shoes',
        handle: 'running-shoes',
        price: 89.99,
        vendor: 'Sports Brand',
        productType: 'Footwear',
        status: 'active'
      },
      {
        shopifyProductId: '2005',
        title: 'Laptop Stand',
        handle: 'laptop-stand',
        price: 45.50,
        vendor: 'Office Supply',
        productType: 'Accessories',
        status: 'active'
      }
    ];

    // Create customers
    const createdCustomers = [];
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: {
          ...customerData,
          tenantId
        }
      });
      createdCustomers.push(customer);
    }

    // Create products
    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({
        data: {
          ...productData,
          tenantId
        }
      });
      createdProducts.push(product);
    }

    // Sample orders with realistic dates (last 30 days)
    const orders = [
      {
        shopifyOrderId: '3001',
        customerId: createdCustomers[0].id,
        orderNumber: 'ORD-001',
        totalPrice: 89.99,
        subtotalPrice: 89.99,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
      },
      {
        shopifyOrderId: '3002',
        customerId: createdCustomers[1].id,
        orderNumber: 'ORD-002',
        totalPrice: 245.48,
        subtotalPrice: 245.48,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
      },
      {
        shopifyOrderId: '3003',
        customerId: createdCustomers[0].id,
        orderNumber: 'ORD-003',
        totalPrice: 199.99,
        subtotalPrice: 199.99,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'shipped',
        orderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      },
      {
        shopifyOrderId: '3004',
        customerId: createdCustomers[2].id,
        orderNumber: 'ORD-004',
        totalPrice: 75.98,
        subtotalPrice: 75.98,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) // 12 days ago
      },
      {
        shopifyOrderId: '3005',
        customerId: createdCustomers[3].id,
        orderNumber: 'ORD-005',
        totalPrice: 329.97,
        subtotalPrice: 329.97,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      },
      {
        shopifyOrderId: '3006',
        customerId: createdCustomers[1].id,
        orderNumber: 'ORD-006',
        totalPrice: 45.50,
        subtotalPrice: 45.50,
        currency: 'USD',
        financialStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        shopifyOrderId: '3007',
        customerId: createdCustomers[4].id,
        orderNumber: 'ORD-007',
        totalPrice: 480.30,
        subtotalPrice: 480.30,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        shopifyOrderId: '3008',
        customerId: createdCustomers[3].id,
        orderNumber: 'ORD-008',
        totalPrice: 119.98,
        subtotalPrice: 119.98,
        currency: 'USD',
        financialStatus: 'paid',
        fulfillmentStatus: 'shipped',
        orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];

    // Create orders
    const createdOrders = [];
    for (const orderData of orders) {
      const order = await prisma.order.create({
        data: {
          ...orderData,
          tenantId
        }
      });
      createdOrders.push(order);
    }

    // Create order items for each order
    const orderItemsData = [
      // Order 1 - Running Shoes
      { orderId: createdOrders[0].id, productId: createdProducts[3].id, title: 'Running Shoes', quantity: 1, price: 89.99 },
      
      // Order 2 - Multiple items
      { orderId: createdOrders[1].id, productId: createdProducts[1].id, title: 'Wireless Headphones', quantity: 1, price: 199.99 },
      { orderId: createdOrders[1].id, productId: createdProducts[0].id, title: 'Premium T-Shirt', quantity: 1, price: 29.99 },
      { orderId: createdOrders[1].id, productId: createdProducts[2].id, title: 'Coffee Mug', quantity: 1, price: 15.99 },
      
      // Order 3 - Wireless Headphones
      { orderId: createdOrders[2].id, productId: createdProducts[1].id, title: 'Wireless Headphones', quantity: 1, price: 199.99 },
      
      // Order 4 - T-shirt and Mug
      { orderId: createdOrders[3].id, productId: createdProducts[0].id, title: 'Premium T-Shirt', quantity: 2, price: 29.99 },
      { orderId: createdOrders[3].id, productId: createdProducts[2].id, title: 'Coffee Mug', quantity: 1, price: 15.99 },
      
      // Order 5 - Electronics bundle
      { orderId: createdOrders[4].id, productId: createdProducts[1].id, title: 'Wireless Headphones', quantity: 1, price: 199.99 },
      { orderId: createdOrders[4].id, productId: createdProducts[4].id, title: 'Laptop Stand', quantity: 1, price: 45.50 },
      { orderId: createdOrders[4].id, productId: createdProducts[0].id, title: 'Premium T-Shirt', quantity: 3, price: 29.99 },
      
      // Order 6 - Laptop Stand
      { orderId: createdOrders[5].id, productId: createdProducts[4].id, title: 'Laptop Stand', quantity: 1, price: 45.50 },
      
      // Order 7 - Large order
      { orderId: createdOrders[6].id, productId: createdProducts[1].id, title: 'Wireless Headphones', quantity: 2, price: 199.99 },
      { orderId: createdOrders[6].id, productId: createdProducts[3].id, title: 'Running Shoes', quantity: 1, price: 89.99 },
      
      // Order 8 - Mixed items
      { orderId: createdOrders[7].id, productId: createdProducts[0].id, title: 'Premium T-Shirt', quantity: 4, price: 29.99 }
    ];

    // Create order items
    for (const itemData of orderItemsData) {
      await prisma.orderItem.create({
        data: itemData
      });
    }

    console.log('✅ Sample data seeded successfully!');
    console.log(`📊 Created: ${customers.length} customers, ${products.length} products, ${orders.length} orders`);

    return {
      customers: createdCustomers,
      products: createdProducts,
      orders: createdOrders
    };

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
};

/**
 * Clear all data for a tenant
 */
const clearTenantData = async (tenantId) => {
  try {
    console.log(`🧹 Clearing data for tenant: ${tenantId}`);

    // Delete in order due to foreign key constraints
    await prisma.orderItem.deleteMany({ where: { order: { tenantId } } });
    await prisma.order.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.product.deleteMany({ where: { tenantId } });
    await prisma.event.deleteMany({ where: { tenantId } });

    console.log('✅ Tenant data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing tenant data:', error);
    throw error;
  }
};

module.exports = {
  seedSampleData,
  clearTenantData
};