const prisma = require('../../../lib/prisma');
const { generateUserId, hashPassword, comparePassword, generateToken, verifyToken } = require('../utils/authUtils');

const authService = {
    async register(userData) {
        const { full_name, contact_number, email, password, role = 'buyer' } = userData;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const userId = generateUserId();
        const password_hash = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                id: userId,
                full_name,
                contact_number,
                email,
                password_hash,
                role
            },
            select: {
                id: true,
                full_name: true,
                contact_number: true,
                email: true,
                role: true,
                created_at: true
            }
        });

        const token = generateToken({ userId: user.id, role: user.role });

        return { user, token };
    },

    async login(credentials) {
        const { email, password } = credentials;

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('Invalid email or password');
        }

        if (!user.is_active) {
            throw new Error('Account is deactivated');
        }

        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        const token = generateToken({ userId: user.id, role: user.role });

        return {
            user: {
                id: user.id,
                full_name: user.full_name,
                contact_number: user.contact_number,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            },
            token
        };
    },

    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                full_name: true,
                contact_number: true,
                email: true,
                role: true,
                created_at: true,
                updated_at: true
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    },

    async logout(token) {
        try {
            const decoded = verifyToken(token);
            const expires_at = new Date(decoded.exp * 1000);

            await prisma.blacklistedToken.create({
                data: {
                    token,
                    userId: decoded.userId,
                    expires_at
                }
            });

            return true;
        } catch (error) {
            throw new Error('Failed to logout: ' + error.message);
        }
    },

    async deactivateAccount(userId, password) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { ia_active: false },
            select: {
                id: true,
                email: true,
                ia_active: true
            }
        });

        return updatedUser;
    },

    async deleteAccount(userId, password) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const deletedUser = await prisma.user.delete({
            where: { id: userId },
            select: {
                id: true,
                email: true
            }
        });

        return deletedUser;
    }
};

module.exports = authService;