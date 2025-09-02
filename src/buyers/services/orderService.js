const prisma = require('../../../lib/prisma');
const orderUtils = require('../utils/orderUtils');

const orderService = {

    async placeOrder(orderData, buyerId) {
        const { supplierId, items, currency = 'USD' } = orderData;

        const supplier = await prisma.user.findUnique({
            where: {
                id: supplierId,
                role: 'supplier',
                is_active: true
            }
        });

        if (!supplier) {
            throw new Error('Invalid supplier or supplier not active');
        }

        return await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const orderItems = [];
            const stockValidationErrors = [];

            for (const item of items) {
                const { productId, quantity, unitCode } = item;

                const product = await tx.product.findFirst({
                    where: {
                        id: productId,
                        supplierId,
                        is_active: true
                    },
                    include: {
                        unit: true,
                        inventory: true
                    }
                });

                if (!product) {
                    throw new Error(`Product ${productId} not found or not available from this supplier`);
                }

                const quantityBase = await orderUtils.convertToBaseUnit(quantity, unitCode);

                try {
                    await orderUtils.validateStock(productId, quantityBase, unitCode);
                } catch (error) {
                    if (error.code === 'INSUFFICIENT_STOCK') {
                        stockValidationErrors.push({
                            productId,
                            productName: product.name,
                            requestedQuantity: quantity,
                            requestedUnit: unitCode,
                            availableQuantity: error.availableInRequestedUnit,
                            availableUnit: unitCode,
                            baseAvailableQuantity: error.availableInBaseUnit,
                            baseUnit: error.baseUnitCode,
                            message: error.message
                        });
                    } else {
                        throw error;
                    }
                }
            }

            if (stockValidationErrors.length > 0) {
                const error = new Error('Insufficient stock for some products');
                error.code = 'MULTIPLE_STOCK_ERRORS';
                error.stockErrors = stockValidationErrors;
                throw error;
            }

            for (const item of items) {
                const { productId, quantity, unitCode } = item;

                const product = await tx.product.findFirst({
                    where: {
                        id: productId,
                        supplierId,
                        is_active: true
                    },
                    include: {
                        unit: true,
                        inventory: true
                    }
                });

                const quantityBase = await orderUtils.convertToBaseUnit(quantity, unitCode);
                const itemTotalPrice = await orderUtils.calculateItemTotal(productId, quantity, unitCode);
                const unitPriceInRequestedUnit = await orderUtils.calculateUnitPriceInRequestedUnit(
                    product.price,
                    unitCode
                );

                orderItems.push({
                    product_id: productId,
                    quantity,
                    unit_code: unitCode,
                    unit_price: unitPriceInRequestedUnit,
                    total_price: itemTotalPrice,
                    quantity_base: quantityBase
                });

                totalAmount += itemTotalPrice;
            }

            const order = await tx.order.create({
                data: {
                    buyerId,
                    supplierId,
                    totalAmount,
                    currency,
                    items: {
                        create: orderItems
                    },
                    statusHistory: {
                        create: {
                            toStatus: 'PENDING',
                            reason: 'Order placed by buyer'
                        }
                    }
                },
                include: {
                    items: {
                        include: {
                            product: { include: { unit: true } },
                            unit: true
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
                    buyer: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true
                        }
                    },
                    statusHistory: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            return orderUtils.formatOrderResponse(order);
        });
    },

    async getBuyerOrders(buyerId, status, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = { buyerId };

        if (status) {
            where.status = status;
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
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
                    supplier: {
                        select: {
                            id: true,
                            full_name: true,
                            email: true,
                            contact_number: true
                        }
                    },
                    statusHistory: {
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
            orders: orders.map(orderUtils.formatOrderResponse),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    async getOrderDetail(orderId, buyerId) {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                buyerId
            },
            include: {
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
                supplier: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        contact_number: true
                    }
                },
                statusHistory: {
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

        return orderUtils.formatOrderResponse(order);
    },

    async cancelOrder(orderId, buyerId, reason = 'Cancelled by buyer') {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                buyerId
            }
        });

        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new Error(`Cannot cancel order with status: ${order.status}`);
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    statusHistory: {
                        create: {
                            fromStatus: order.status,
                            toStatus: 'CANCELLED',
                            reason,
                            userId: buyerId
                        }
                    }
                },
                include: {
                    items: {
                        include: {
                            product: true,
                            unit: true
                        }
                    },
                    supplier: true,
                    statusHistory: {
                        orderBy: { created_at: 'desc' },
                        take: 1
                    }
                }
            });

            return order;
        });

        return orderUtils.formatOrderResponse(updatedOrder);
    },

    async getOrderStatistics(buyerId) {
        const stats = await prisma.order.groupBy({
            by: ['status'],
            where: { buyerId },
            _count: {
                id: true
            },
            _sum: {
                totalAmount: true
            }
        });

        const totalOrders = await prisma.order.count({
            where: { buyerId }
        });

        const totalSpent = await prisma.order.aggregate({
            where: {
                buyerId,
                status: { in: ['APPROVED', 'FULFILLED'] }
            },
            _sum: {
                totalAmount: true
            }
        });

        return {
            byStatus: stats.reduce((acc, stat) => {
                acc[stat.status] = {
                    count: stat._count.id,
                    totalAmount: stat._sum.totalAmount || 0
                };
                return acc;
            }, {}),
            totalOrders,
            totalSpent: totalSpent._sum.totalAmount || 0
        };
    }
};

module.exports = orderService;