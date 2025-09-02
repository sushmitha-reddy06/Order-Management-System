const prisma = require("../../../lib/prisma");

const productService = {
    async createProduct(productData, supplierId) {
        const { name, description, price, baseUnitCode, category, imageUrl, initialStock } = productData;

        const unit = await prisma.Unit.findUnique({
            where: { code: baseUnitCode }
        });

        if (!unit) {
            throw new Error('Invalid unit code');
        }

        return await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name,
                    description,
                    price,
                    baseUnitCode,
                    supplierId,
                    category,
                    imageUrl
                },
                include: {
                    unit: true
                }
            });

            if (initialStock !== undefined) {
                await tx.inventory.create({
                    data: {
                        productId: product.id,
                        quantity: initialStock
                    }
                });
            }

            return product;
        });
    },

    async getSupplierProducts(supplierId, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where: { supplierId },
                include: {
                    unit: true,
                    inventory: true
                },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            }),
            prisma.product.count({
                where: { supplierId }
            })
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

    async getProduct(productId, supplierId) {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                supplierId
            },
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
            }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return product;
    },

    async updateProduct(productId, supplierId, updates) {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                supplierId
            }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        if (updates.baseUnitCode) {
            const unit = await prisma.Unit.findUnique({
                where: { code: updates.baseUnitCode }
            });

            if (!unit) {
                throw new Error('Invalid unit code');
            }
        }

        return await prisma.product.update({
            where: { id: productId },
            data: updates,
            include: {
                unit: true,
                inventory: true
            }
        });
    },

    async deleteProduct(productId, supplierId) {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                supplierId
            }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return await prisma.product.delete({
            where: { id: productId }
        });
    },

    async updateInventory(productId, supplierId, deltaBase) {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                supplierId
            },
            include: {
                inventory: true
            }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        let inventory;
        const newQuantity = (product.inventory?.quantity || 0) + deltaBase;

        if (newQuantity < 0) {
            throw new Error('Insufficient stock');
        }

        if (product.inventory) {
            inventory = await prisma.inventory.update({
                where: { productId },
                data: { quantity: newQuantity },
                include: { product: true }
            });
        } else {
            inventory = await prisma.inventory.create({
                data: {
                    productId,
                    quantity: newQuantity
                },
                include: { product: true }
            });
        }

        return inventory;
    },

    async getSupplierOrders(supplierId, status, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = { supplierId };

        if (status) {
            where.status = status;
        }

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
                    statusHistory: {
                        orderBy: { created_at: 'desc' },
                        take: 1
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
    }
};

module.exports = productService;