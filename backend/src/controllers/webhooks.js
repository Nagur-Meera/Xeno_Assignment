const crypto = require('crypto');
const prisma = require('../utils/prisma');

/**
 * Verify Shopify webhook signature
 */
const verifyWebhook = (data, signature, secret) => {
  const calculatedSignature = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(calculatedSignature, 'base64')
  );
};

/**
 * Get tenant by Shopify domain
 */
const getTenantByDomain = async (shopDomain) => {
  return await prisma.tenant.findUnique({
    where: { shopifyDomain: shopDomain }
  });
};

/**
 * Handle customer creation/update webhook
 */
const handleCustomerWebhook = async (req, res) => {
  try {
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const webhookSignature = req.get('X-Shopify-Hmac-Sha256');
    const rawBody = req.body;

    // Get tenant
    const tenant = await getTenantByDomain(shopDomain);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify webhook signature if secret is configured
    if (tenant.webhookSecret) {
      if (!webhookSignature || !verifyWebhook(rawBody, webhookSignature, tenant.webhookSecret)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const customerData = JSON.parse(rawBody);

    // Upsert customer
    const customer = await prisma.customer.upsert({
      where: {
        shopifyCustomerId_tenantId: {
          shopifyCustomerId: customerData.id.toString(),
          tenantId: tenant.id
        }
      },
      update: {
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        email: customerData.email,
        phone: customerData.phone,
        totalSpent: parseFloat(customerData.total_spent || 0),
        ordersCount: customerData.orders_count || 0,
        tags: customerData.tags,
        updatedAt: new Date()
      },
      create: {
        shopifyCustomerId: customerData.id.toString(),
        tenantId: tenant.id,
        firstName: customerData.first_name,
        lastName: customerData.last_name,
        email: customerData.email,
        phone: customerData.phone,
        totalSpent: parseFloat(customerData.total_spent || 0),
        ordersCount: customerData.orders_count || 0,
        tags: customerData.tags
      }
    });

    console.log(`Customer ${customerData.id} processed for tenant ${tenant.name}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Customer webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle order creation/update webhook
 */
const handleOrderWebhook = async (req, res) => {
  try {
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const webhookSignature = req.get('X-Shopify-Hmac-Sha256');
    const rawBody = req.body;

    // Get tenant
    const tenant = await getTenantByDomain(shopDomain);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify webhook signature if secret is configured
    if (tenant.webhookSecret) {
      if (!webhookSignature || !verifyWebhook(rawBody, webhookSignature, tenant.webhookSecret)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const orderData = JSON.parse(rawBody);

    // Find or create customer first
    let customer = null;
    if (orderData.customer) {
      customer = await prisma.customer.upsert({
        where: {
          shopifyCustomerId_tenantId: {
            shopifyCustomerId: orderData.customer.id.toString(),
            tenantId: tenant.id
          }
        },
        update: {
          firstName: orderData.customer.first_name,
          lastName: orderData.customer.last_name,
          email: orderData.customer.email,
          phone: orderData.customer.phone,
          updatedAt: new Date()
        },
        create: {
          shopifyCustomerId: orderData.customer.id.toString(),
          tenantId: tenant.id,
          firstName: orderData.customer.first_name,
          lastName: orderData.customer.last_name,
          email: orderData.customer.email,
          phone: orderData.customer.phone
        }
      });
    }

    // Upsert order
    const order = await prisma.order.upsert({
      where: {
        shopifyOrderId_tenantId: {
          shopifyOrderId: orderData.id.toString(),
          tenantId: tenant.id
        }
      },
      update: {
        orderNumber: orderData.order_number?.toString() || orderData.name,
        totalPrice: parseFloat(orderData.total_price),
        subtotalPrice: parseFloat(orderData.subtotal_price),
        totalTax: parseFloat(orderData.total_tax || 0),
        totalDiscounts: parseFloat(orderData.total_discounts || 0),
        currency: orderData.currency,
        financialStatus: orderData.financial_status,
        fulfillmentStatus: orderData.fulfillment_status,
        orderDate: new Date(orderData.created_at),
        cancelledAt: orderData.cancelled_at ? new Date(orderData.cancelled_at) : null,
        processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null,
        updatedAt: new Date()
      },
      create: {
        shopifyOrderId: orderData.id.toString(),
        tenantId: tenant.id,
        customerId: customer?.id,
        orderNumber: orderData.order_number?.toString() || orderData.name,
        totalPrice: parseFloat(orderData.total_price),
        subtotalPrice: parseFloat(orderData.subtotal_price),
        totalTax: parseFloat(orderData.total_tax || 0),
        totalDiscounts: parseFloat(orderData.total_discounts || 0),
        currency: orderData.currency,
        financialStatus: orderData.financial_status,
        fulfillmentStatus: orderData.fulfillment_status,
        orderDate: new Date(orderData.created_at),
        cancelledAt: orderData.cancelled_at ? new Date(orderData.cancelled_at) : null,
        processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null
      }
    });

    // Process order items
    if (orderData.line_items && orderData.line_items.length > 0) {
      // Delete existing order items
      await prisma.orderItem.deleteMany({
        where: { orderId: order.id }
      });

      // Create new order items
      for (const item of orderData.line_items) {
        // Find or create product
        let product = null;
        if (item.product_id) {
          product = await prisma.product.upsert({
            where: {
              shopifyProductId_tenantId: {
                shopifyProductId: item.product_id.toString(),
                tenantId: tenant.id
              }
            },
            update: {
              title: item.title,
              price: parseFloat(item.price),
              updatedAt: new Date()
            },
            create: {
              shopifyProductId: item.product_id.toString(),
              tenantId: tenant.id,
              title: item.title,
              handle: item.title.toLowerCase().replace(/\s+/g, '-'),
              price: parseFloat(item.price),
              vendor: item.vendor,
              productType: item.product_type
            }
          });
        }

        // Create order item
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: product?.id,
            title: item.title,
            quantity: item.quantity,
            price: parseFloat(item.price),
            totalDiscount: parseFloat(item.total_discount || 0)
          }
        });
      }
    }

    // Update customer total spent and order count
    if (customer && orderData.financial_status === 'paid') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: {
            increment: parseFloat(orderData.total_price)
          },
          ordersCount: {
            increment: 1
          }
        }
      });
    }

    console.log(`Order ${orderData.id} processed for tenant ${tenant.name}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Order webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle product creation/update webhook
 */
const handleProductWebhook = async (req, res) => {
  try {
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    const webhookSignature = req.get('X-Shopify-Hmac-Sha256');
    const rawBody = req.body;

    // Get tenant
    const tenant = await getTenantByDomain(shopDomain);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Verify webhook signature if secret is configured
    if (tenant.webhookSecret) {
      if (!webhookSignature || !verifyWebhook(rawBody, webhookSignature, tenant.webhookSecret)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const productData = JSON.parse(rawBody);

    // Get the first variant for pricing (Shopify products have variants)
    const firstVariant = productData.variants?.[0];
    const price = firstVariant ? parseFloat(firstVariant.price) : 0;
    const compareAtPrice = firstVariant?.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    // Upsert product
    const product = await prisma.product.upsert({
      where: {
        shopifyProductId_tenantId: {
          shopifyProductId: productData.id.toString(),
          tenantId: tenant.id
        }
      },
      update: {
        title: productData.title,
        handle: productData.handle,
        price: price,
        compareAtPrice: compareAtPrice,
        vendor: productData.vendor,
        productType: productData.product_type,
        status: productData.status,
        tags: productData.tags,
        updatedAt: new Date()
      },
      create: {
        shopifyProductId: productData.id.toString(),
        tenantId: tenant.id,
        title: productData.title,
        handle: productData.handle,
        price: price,
        compareAtPrice: compareAtPrice,
        vendor: productData.vendor,
        productType: productData.product_type,
        status: productData.status,
        tags: productData.tags
      }
    });

    console.log(`Product ${productData.id} processed for tenant ${tenant.name}`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Product webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = {
  handleCustomerWebhook,
  handleOrderWebhook,
  handleProductWebhook
};