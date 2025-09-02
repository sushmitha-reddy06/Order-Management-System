const prisma = require("../../../lib/prisma");

const publicProductService = {
    async searchProducts(query, filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        let where = {
            is_active: true
        };

        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
            ];
        }

        if (filters.supplierId) {
            where.supplierId = filters.supplierId;
        }

        if (filters.category) {
            where.category = { contains: filters.category, mode: 'insensitive' };
        }

        if (filters.minPrice !== undefined) {
            where.price = { ...where.price, gte: parseFloat(filters.minPrice) };
        }

        if (filters.maxPrice !== undefined) {
            where.price = { ...where.price, lte: parseFloat(filters.maxPrice) };
        }

        if (filters.inStock !== undefined) {
            if (filters.inStock) {
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
                            email: true,
                            contact_number: true
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

    async getProductById(productId) {
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                is_active: true
            },
            include: {
                unit: true,
                inventory: true,
                supplier: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        contact_number: true
                    }
                }
            }
        });

        if (!product) {
            throw new Error('Product not found or not available');
        }

        return product;
    },

    async getAllProducts(page = 1, limit = 10, filters = {}) {
        const skip = (page - 1) * limit;

        let where = {
            is_active: true
        };

        if (filters.supplierId) {
            where.supplierId = filters.supplierId;
        }

        if (filters.category) {
            where.category = { contains: filters.category, mode: 'insensitive' };
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
                            email: true,
                            contact_number: true
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

    async getProductsByCategory(category, page = 1, limit = 10) {
        return this.getAllProducts(page, limit, { category });
    },

    async getProductsBySupplier(supplierId, page = 1, limit = 10) {
        return this.getAllProducts(page, limit, { supplierId });
    },

    async getCategories() {
        const categories = await prisma.product.findMany({
            where: { is_active: true },
            select: { category: true },
            distinct: ['category']
        });

        return categories
            .map(c => c.category)
            .filter(c => c)
            .sort();
    }
};

module.exports = publicProductService;