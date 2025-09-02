const prisma = require("../../../lib/prisma");

const sellerOrderService = {
    async updateInventory(productId, deltaBase, transaction) {
        const tx = transaction || prisma;

        const inventory = await tx.inventory.upsert({
            where: { productId },
            update: {
                quantity: {
                    increment: deltaBase
                }
            },
            create: {
                productId,
                quantity: deltaBase
            },
            include: {
                product: true
            }
        });

        if (inventory.quantity < 0) {
            throw new Error(`Insufficient stock for product: ${inventory.product.name}`);
        }

        return inventory;
    },

    async updateOrderStatus(orderId, sellerId, newStatus, reason = '') {
        return await prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: {
                    id: orderId,
                    supplierId: sellerId 
                },
                include: {
                    items: {
                        include: {
                            product: {
                                include: {
                                    inventory: true
                                }
                            }
                        }
                    }
                }
            });

            if (!order) {
                throw new Error('Order not found or access denied');
            }

            if (order.status === 'PENDING' && newStatus === 'APPROVED') {
                for (const item of order.items) {
                    await this.updateInventory(
                        item.productId,
                        -item.quantityBase, 
                        tx
                    );
                }
            }
            else if (order.status === 'APPROVED' && newStatus === 'CANCELLED') {
                for (const item of order.items) {
                    await this.updateInventory(
                        item.productId,
                        item.quantityBase, 
                        tx
                    );
                }
            }
            else if (newStatus === 'CANCELLED' && order.status !== 'PENDING') {
                throw new Error('Only PENDING orders can be cancelled directly');
            }

            const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: {
                    status: newStatus,
                    statusHistory: {
                        create: {
                            fromStatus: order.status,
                            toStatus: newStatus,
                            reason,
                            userId: sellerId
                        }
                    }
                },
                include: {
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
                    buyer: {
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
                }
            });

            return updatedOrder;
        });
    },

    async getOrderDetail(orderId, sellerId) {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                supplierId: sellerId
            },
            include: {
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
                buyer: {
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
            throw new Error('Order not found or access denied');
        }

        return order;
    }
};

module.exports = sellerOrderService;