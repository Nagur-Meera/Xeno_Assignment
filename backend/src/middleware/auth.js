const { verifyToken, extractToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/**
 * Authentication middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    
    // Get user with tenant information
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.tenant.isActive) {
      return res.status(403).json({ error: 'Tenant account is inactive' });
    }

    // Attach user and tenant to request
    req.user = user;
    req.tenantId = user.tenantId;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Tenant isolation middleware
 */
const ensureTenantAccess = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({ error: 'Tenant access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  ensureTenantAccess
};