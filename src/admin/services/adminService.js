const prisma = require("../../../lib/prisma");

const adminService = {
    async getAllUsers(role, isActive, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        let where = {};
        if (role) where.role = role;
        if (isActive !== undefined) where.is_active = isActive === 'true';

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    contact_number: true,
                    role: true,
                    is_active: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    _count: {
                        select: {
                            products: true,
                            orders: true,
                            supplierOrders: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    async getUserById(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                products: {
                    include: {
                        unit: true,
                        inventory: true
                    }
                },
                orders: {
                    include: {
                        supplier: {
                            select: {
                                id: true,
                                full_name: true,
                                email: true
                            }
                        },
                        items: {
                            include: {
                                product: true,
                                unit: true
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' },
                    take: 10
                },
                supplierOrders: {
                    include: {
                        buyer: {
                            select: {
                                id: true,
                                full_name: true,
                                email: true
                            }
                        },
                        items: {
                            include: {
                                product: true,
                                unit: true
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' },
                    take: 10
                }
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    },

    async getAllOrders(status, supplierId, buyerId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        let where = {};
        if (status) where.status = status;
        if (supplierId) where.supplier_id = supplierId;
        if (buyerId) where.buyer_id = buyerId;

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    buyer: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                            contact_number: true
                        }
                    },
                    supplier: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                            contact_number: true
                        }
                    },
                    items: {
                        include: {
                            product: {
                                include: {
                                    unit: true
                                }
                            },
                            unit: true
                        }
                    },
                    status_history: {
                        orderBy: { created_at: 'desc' },
                        take: 5
                    }
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.order.count({ where })
        ]);

        return {
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    async getOrderById(orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                buyer: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        contact_number: true
                    }
                },
                supplier: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        contact_number: true
                    }
                },
                items: {
                    include: {
                        product: {
                            include: {
                                unit: true,
                                inventory: true
                            }
                        },
                        unit: true
                    }
                },
                status_history: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                full_name: true,
                                role: true
                            }
                        }
                    },
                    orderBy: { created_at: 'asc' }
                }
            }
        });

        if (!order) {
            throw new Error('Order not found');
        }

        return order;
    },

    async getAllProducts(supplierId, category, inStock, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        let where = { is_active: true };
        if (supplierId) where.supplier_id = supplierId;
        if (category) where.category = { contains: category, mode: 'insensitive' };

        if (inStock !== undefined) {
            if (inStock === 'true') {
                where.inventory = {
                    quantity: { gt: 0 }
                };
            } else {
                where.OR = [
                    { inventory: null },
                    { inventory: { quantity: { lte: 0 } } }
                ];
            }
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    unit: true,
                    inventory: true,
                    supplier: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.product.count({ where })
        ]);

        return {
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    async getAnalytics() {
        const [
            totalUsers,
            totalSuppliers,
            totalBuyers,
            totalProducts,
            totalOrders,
            revenueStats,
            orderStats,
            topProducts,
            topSuppliers
        ] = await Promise.all([
            prisma.user.count({ where: { is_active: true } }),
            prisma.user.count({ where: { role: 'SUPPLIER', is_active: true } }),
            prisma.user.count({ where: { role: 'BUYER', is_active: true } }),
            prisma.product.count({ where: { is_active: true } }),
            prisma.order.count(),
            prisma.order.aggregate({
                _sum: { total_amount: true },
                _avg: { total_amount: true },
                where: { status: { in: ['APPROVED', 'FULFILLED'] } }
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: { id: true },
                _sum: { total_amount: true }
            }),
            prisma.orderItem.groupBy({
                by: ['product_id'],
                _sum: { quantity_base: true, total_price: true },
                orderBy: { _sum: { quantity_base: 'desc' } },
                take: 10
            }),
            prisma.order.groupBy({
                by: ['supplier_id'],
                _sum: { total_amount: true },
                _count: { id: true },
                orderBy: { _sum: { total_amount: 'desc' } },
                take: 10
            })
        ]);

        const enrichedTopProducts = await Promise.all(
            topProducts.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.product_id },
                    include: {
                        unit: true,
                        supplier: {
                            select: {
                                full_name: true,
                                email: true
                            }
                        }
                    }
                });
                return {
                    ...item,
                    product
                };
            })
        );

        const enrichedTopSuppliers = await Promise.all(
            topSuppliers.map(async (item) => {
                const supplier = await prisma.user.findUnique({
                    where: { id: item.supplier_id },
                    select: {
                        full_name: true,
                        email: true,
                        contact_number: true
                    }
                });
                return {
                    ...item,
                    supplier
                };
            })
        );

        return {
            overview: {
                totalUsers,
                totalSuppliers,
                totalBuyers,
                totalProducts,
                totalOrders,
                totalRevenue: revenueStats._sum.total_amount || 0,
                averageOrderValue: revenueStats._avg.total_amount || 0
            },
            ordersByStatus: orderStats.reduce((acc, stat) => {
                acc[stat.status] = {
                    count: stat._count.id,
                    revenue: stat._sum.total_amount || 0
                };
                return acc;
            }, {}),
            topProducts: enrichedTopProducts,
            topSuppliers: enrichedTopSuppliers,
            updatedAt: new Date().toISOString()
        };
    },

    async updateUserStatus(userId, isActive) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { is_active: isActive },
            select: {
                id: true,
                full_name: true,
                email: true,
                role: true,
                is_active: true,
                updated_at: true
            }
        });

        return updatedUser;
    },

    async deleteUser(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const deletedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                is_active: false,
                deleted_at: new Date()
            },
            select: {
                id: true,
                full_name: true,
                email: true,
                deleted_at: true
            }
        });

        return deletedUser;
    }
};

module.exports = adminService;