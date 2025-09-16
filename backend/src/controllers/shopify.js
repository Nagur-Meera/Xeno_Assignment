const axios = require('axios');
const prisma = require('../utils/prisma');

/**
 * Create Shopify API client
 */
const createShopifyClient = (shopDomain, accessToken) => {
  // Ensure the domain includes .myshopify.com
  const fullDomain = shopDomain.includes('.myshopify.com') 
    ? shopDomain 
    : `${shopDomain}.myshopify.com`;
    
  return axios.create({
    baseURL: `https://${fullDomain}/admin/api/2024-01/`,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });
};

/**
 * Test Shopify connection
 */
const testConnection = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get tenant with Shopify credentials
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ 
        success: false,
        error: 'Shopify credentials not configured' 
      });
    }

    // Test connection by getting shop info
    const shopify = createShopifyClient(tenant.shopifyDomain, tenant.shopifyAccessToken);
    
    const response = await shopify.get('shop.json');
    
    if (response.data && response.data.shop) {
      res.json({
        success: true,
        shop: {
          name: response.data.shop.name,
          domain: response.data.shop.domain,
          email: response.data.shop.email,
          currency: response.data.shop.currency,
          timezone: response.data.shop.timezone
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid response from Shopify'
      });
    }

  } catch (error) {
    console.error('Shopify connection test error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      res.status(401).json({
        success: false,
        error: 'Invalid Shopify access token'
      });
    } else if (error.response?.status === 403) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions for Shopify API'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to connect to Shopify store'
      });
    }
  }
};

/**
 * Get shop information
 */
const getShopInfo = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Shopify credentials not configured' });
    }

    const shopify = createShopifyClient(tenant.shopifyDomain, tenant.shopifyAccessToken);
    const response = await shopify.get('shop.json');

    res.json({ shop: response.data.shop });

  } catch (error) {
    console.error('Get shop info error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch shop information' });
  }
};

/**
 * Sync customers from Shopify
 */
const syncCustomers = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Shopify credentials not configured' });
    }

    const shopify = createShopifyClient(tenant.shopifyDomain, tenant.shopifyAccessToken);
    
    // Get all customers (with pagination if needed)
    let allCustomers = [];
    let nextPageInfo = null;
    
    do {
      const url = nextPageInfo 
        ? `customers.json?limit=250&page_info=${nextPageInfo}`
        : 'customers.json?limit=250';
        
      const response = await shopify.get(url);
      allCustomers = allCustomers.concat(response.data.customers);
      
      // Check for pagination
      const linkHeader = response.headers.link;
      nextPageInfo = linkHeader && linkHeader.includes('rel="next"') 
        ? linkHeader.split('page_info=')[1].split('&')[0].split('>')[0]
        : null;
        
    } while (nextPageInfo);

    // Sync customers to database
    let syncedCount = 0;
    for (const customerData of allCustomers) {
      try {
        await prisma.customer.upsert({
          where: {
            tenantId_shopifyCustomerId: {
              tenantId: tenantId,
              shopifyCustomerId: customerData.id.toString()
            }
          },
          update: {
            email: customerData.email,
            firstName: customerData.first_name,
            lastName: customerData.last_name,
            phone: customerData.phone,
            totalSpent: customerData.total_spent ? parseFloat(customerData.total_spent) : 0,
            ordersCount: customerData.orders_count || 0,
            tags: customerData.tags,
            updatedAt: new Date()
          },
          create: {
            tenantId: tenantId,
            shopifyCustomerId: customerData.id.toString(),
            email: customerData.email,
            firstName: customerData.first_name,
            lastName: customerData.last_name,
            phone: customerData.phone,
            totalSpent: customerData.total_spent ? parseFloat(customerData.total_spent) : 0,
            ordersCount: customerData.orders_count || 0,
            tags: customerData.tags,
            createdAt: new Date(customerData.created_at),
            updatedAt: new Date(customerData.updated_at)
          }
        });
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing customer ${customerData.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} customers`,
      count: syncedCount,
      total: allCustomers.length,
      synced: syncedCount
    });

  } catch (error) {
    console.error('Sync customers error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to sync customers' });
  }
};

/**
 * Sync orders from Shopify
 */
const syncOrders = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Shopify credentials not configured' });
    }

    const shopify = createShopifyClient(tenant.shopifyDomain, tenant.shopifyAccessToken);
    
    // Get all orders
    let allOrders = [];
    let nextPageInfo = null;
    
    do {
      const url = nextPageInfo 
        ? `orders.json?limit=250&status=any&page_info=${nextPageInfo}`
        : 'orders.json?limit=250&status=any';
        
      const response = await shopify.get(url);
      allOrders = allOrders.concat(response.data.orders);
      
      // Check for pagination
      const linkHeader = response.headers.link;
      nextPageInfo = linkHeader && linkHeader.includes('rel="next"') 
        ? linkHeader.split('page_info=')[1].split('&')[0].split('>')[0]
        : null;
        
    } while (nextPageInfo);

    // Sync orders to database
    let syncedCount = 0;
    for (const orderData of allOrders) {
      try {
        // Find or create customer
        let customer = null;
        if (orderData.customer) {
          customer = await prisma.customer.findFirst({
            where: {
              tenantId: tenantId,
              shopifyCustomerId: orderData.customer.id.toString()
            }
          });
        }

        // Get the created/updated order
        const order = await prisma.order.upsert({
          where: {
            tenantId_shopifyOrderId: {
              tenantId: tenantId,
              shopifyOrderId: orderData.id.toString()
            }
          },
          update: {
            orderNumber: orderData.order_number?.toString(),
            totalPrice: parseFloat(orderData.total_price),
            subtotalPrice: parseFloat(orderData.subtotal_price || 0),
            totalTax: parseFloat(orderData.total_tax || 0),
            totalDiscounts: parseFloat(orderData.total_discounts || 0),
            currency: orderData.currency,
            financialStatus: orderData.financial_status,
            fulfillmentStatus: orderData.fulfillment_status,
            tags: orderData.tags,
            updatedAt: new Date(orderData.updated_at)
          },
          create: {
            tenantId: tenantId,
            shopifyOrderId: orderData.id.toString(),
            customerId: customer?.id,
            orderNumber: orderData.order_number?.toString(),
            totalPrice: parseFloat(orderData.total_price),
            subtotalPrice: parseFloat(orderData.subtotal_price || 0),
            totalTax: parseFloat(orderData.total_tax || 0),
            totalDiscounts: parseFloat(orderData.total_discounts || 0),
            currency: orderData.currency,
            financialStatus: orderData.financial_status,
            fulfillmentStatus: orderData.fulfillment_status,
            tags: orderData.tags,
            orderDate: new Date(orderData.created_at),
            createdAt: new Date(orderData.created_at),
            updatedAt: new Date(orderData.updated_at)
          }
        });

        // Delete existing order items for this order (in case of update)
        await prisma.orderItem.deleteMany({
          where: { orderId: order.id }
        });

        // Create order items (line items)
        if (orderData.line_items && orderData.line_items.length > 0) {
          for (const lineItem of orderData.line_items) {
            try {
              // Find the product by Shopify product ID
              const product = await prisma.product.findFirst({
                where: {
                  tenantId: tenantId,
                  shopifyProductId: lineItem.product_id?.toString()
                }
              });

              // Create order item
              await prisma.orderItem.create({
                data: {
                  orderId: order.id,
                  productId: product?.id,
                  title: lineItem.title,
                  quantity: lineItem.quantity,
                  price: parseFloat(lineItem.price),
                  totalDiscount: parseFloat(lineItem.total_discount || 0)
                }
              });
            } catch (itemError) {
              console.error(`Error creating order item for line item ${lineItem.id}:`, itemError);
            }
          }
        }
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing order ${orderData.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} orders`,
      count: syncedCount,
      total: allOrders.length,
      synced: syncedCount
    });

  } catch (error) {
    console.error('Sync orders error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
};

/**
 * Sync products from Shopify
 */
const syncProducts = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Shopify credentials not configured' });
    }

    const shopify = createShopifyClient(tenant.shopifyDomain, tenant.shopifyAccessToken);
    
    // Get all products
    let allProducts = [];
    let nextPageInfo = null;
    
    do {
      const url = nextPageInfo 
        ? `products.json?limit=250&page_info=${nextPageInfo}`
        : 'products.json?limit=250';
        
      const response = await shopify.get(url);
      allProducts = allProducts.concat(response.data.products);
      
      // Check for pagination
      const linkHeader = response.headers.link;
      nextPageInfo = linkHeader && linkHeader.includes('rel="next"') 
        ? linkHeader.split('page_info=')[1].split('&')[0].split('>')[0]
        : null;
        
    } while (nextPageInfo);

    // Sync products to database
    let syncedCount = 0;
    for (const productData of allProducts) {
      try {
        await prisma.product.upsert({
          where: {
            tenantId_shopifyProductId: {
              tenantId: tenantId,
              shopifyProductId: productData.id.toString()
            }
          },
          update: {
            title: productData.title,
            description: productData.body_html,
            vendor: productData.vendor,
            productType: productData.product_type,
            tags: productData.tags,
            status: productData.status,
            updatedAt: new Date(productData.updated_at)
          },
          create: {
            tenantId: tenantId,
            shopifyProductId: productData.id.toString(),
            title: productData.title,
            description: productData.body_html,
            vendor: productData.vendor,
            productType: productData.product_type,
            tags: productData.tags,
            status: productData.status,
            createdAt: new Date(productData.created_at),
            updatedAt: new Date(productData.updated_at)
          }
        });
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing product ${productData.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${syncedCount} products`,
      count: syncedCount,
      total: allProducts.length,
      synced: syncedCount
    });

  } catch (error) {
    console.error('Sync products error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to sync products' });
  }
};

module.exports = {
  testConnection,
  getShopInfo,
  syncCustomers,
  syncOrders,
  syncProducts
};