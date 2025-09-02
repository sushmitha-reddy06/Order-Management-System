const { verifyToken, extractToken } = require('../src/auth/utils/authUtils');
const User = require('../src/auth/models/userModel');
const prisma = require('../lib/prisma');

const authenticateToken = async (req, res, next) => {
    try {
        const token = extractToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }

        const blacklistedToken = await prisma.blacklistedToken.findFirst({
            where: {
                token,
                expires_at: { gt: new Date() }
            }
        });

        if (blacklistedToken) {
            return res.status(401).json({
                error: 'Token revoked',
                message: 'This token is no longer valid'
            });
        }

        const decoded = verifyToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                full_name: true,
                contact_number: true,
                email: true,
                role: true,
                is_active: true,
                created_at: true
            }
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'User not found'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Authentication failed',
            message: error.message
        });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: `Required role: ${roles.join(' or ')}`
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};