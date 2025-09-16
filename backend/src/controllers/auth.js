const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/**
 * Register new user and tenant
 */
const register = async (req, res) => {
  try {
    const { email, password, name, tenantName, shopifyDomain } = req.body;

    // Validation
    if (!email || !password || !name || !tenantName || !shopifyDomain) {
      return res.status(400).json({ 
        error: 'Email, password, name, tenant name, and Shopify domain are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if tenant domain already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (existingTenant) {
      return res.status(400).json({ error: 'Shopify domain already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create tenant and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          shopifyDomain,
          isActive: true
        }
      });

      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          tenantId: tenant.id,
          role: 'admin'
        },
        include: {
          tenant: true
        }
      });

      return { user, tenant };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          shopifyDomain: result.tenant.shopifyDomain
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with tenant
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if tenant is active
    if (!user.tenant.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          shopifyDomain: user.tenant.shopifyDomain,
          hasShopifyToken: !!user.tenant.shopifyAccessToken,
          shopifyAccessToken: user.tenant.shopifyAccessToken ? 
            `${user.tenant.shopifyAccessToken.substring(0, 8)}...${user.tenant.shopifyAccessToken.slice(-4)}` : 
            null
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
            isActive: true,
            shopifyAccessToken: true,
            shopifyWebhookSecret: true
          }
        }
      }
    });

    res.json({ 
      user: {
        ...user,
        tenant: {
          ...user.tenant,
          hasShopifyToken: !!user.tenant.shopifyAccessToken,
          shopifyAccessToken: user.tenant.shopifyAccessToken ? 
            `${user.tenant.shopifyAccessToken.substring(0, 8)}...${user.tenant.shopifyAccessToken.slice(-4)}` : 
            null
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prepare update data
    const updateData = { name, email };

    // If updating password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      // Hash new password
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { tenant: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
            isActive: true
          }
        }
      }
    });

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
const updateShopifyCredentials = async (req, res) => {
  try {
    const { shopifyToken, webhookSecret } = req.body;

    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        ...(shopifyToken && { shopifyAccessToken: shopifyToken }),
        ...(webhookSecret && { shopifyWebhookSecret: webhookSecret })
      }
    });

    res.json({
      message: 'Shopify credentials updated successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        shopifyDomain: tenant.shopifyDomain,
        hasCredentials: !!tenant.shopifyAccessToken
      }
    });

  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  updateShopifyCredentials
};