const prisma = require("../../../lib/prisma");


const orderUtils = {
    async convertToBaseUnit(quantity, unitCode) {
        const unit = await prisma.unit.findUnique({
            where: { code: unitCode }
        });

        if (!unit) {
            throw new Error(`Invalid unit code: ${unitCode}`);
        }

        return quantity * unit.factorToBase;
    },

    async convertFromBaseUnit(quantityBase, targetUnitCode) {
        const unit = await prisma.unit.findUnique({
            where: { code: targetUnitCode }
        });

        if (!unit) {
            throw new Error(`Invalid unit code: ${targetUnitCode}`);
        }

        return quantityBase / unit.factorToBase;
    },

    async calculateUnitPriceInRequestedUnit(baseUnitPrice, requestedUnitCode) {
        const unit = await prisma.unit.findUnique({
            where: { code: requestedUnitCode }
        });

        if (!unit) {
            throw new Error(`Invalid unit code: ${requestedUnitCode}`);
        }

        return baseUnitPrice * unit.factorToBase;
    },

    async calculateItemTotal(productId, quantity, requestedUnitCode) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { unit: true }
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const unitPriceInRequestedUnit = await this.calculateUnitPriceInRequestedUnit(
            product.price,
            requestedUnitCode
        );

        return quantity * unitPriceInRequestedUnit;
    },

    async validateStock(productId, quantityBase) {
        const inventory = await prisma.inventory.findUnique({
            where: { productId },
            include: { product: true }
        });

        if (!inventory) {
            throw new Error(`Product inventory not found`);
        }

        if (inventory.quantity < quantityBase) {
            throw new Error(`Insufficient stock. Available: ${inventory.quantity} ${inventory.product.baseUnitCode}, Requested: ${quantityBase} ${inventory.product.baseUnitCode}`);
        }

        return true;
    },

    formatOrderResponse(order) {
        return {
            id: order.id,
            buyerId: order.buyerId,
            supplierId: order.supplierId,
            totalAmount: order.totalAmount,
            currency: order.currency,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: order.items.map(item => ({
                id: item.id,
                productId: item.productId,
                productName: item.product.name,
                quantity: item.quantity,
                unitCode: item.unitCode,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                quantityBase: item.quantityBase,
                baseUnitPrice: item.product.price,
                baseUnitCode: item.product.baseUnitCode
            })),
            supplier: {
                id: order.supplier.id,
                fullName: order.supplier.fullName,
                email: order.supplier.email,
                contactNumber: order.supplier.contactNumber
            },
            buyer: {
                id: order.buyer.id,
                fullName: order.buyer.fullName,
                email: order.buyer.email
            },
            statusHistory: order.statusHistory.map(history => ({
                id: history.id,
                orderId: history.orderId,
                userId: history.userId,
                fromStatus: history.fromStatus,
                toStatus: history.toStatus,
                reason: history.reason,
                createdAt: history.createdAt
            }))
        };
    },

    async validateStock(productId, quantityBase, requestedUnitCode = null) {
        const inventory = await prisma.inventory.findUnique({
            where: { productId },
            include: {
                product: {
                    include: { unit: true }
                }
            }
        });

        if (!inventory) {
            throw new Error(`Product inventory not found`);
        }

        if (inventory.quantity < quantityBase) {
            let availableQuantity = inventory.quantity;
            let availableInRequestedUnit = inventory.quantity;
            let message = `Insufficient stock. Available: ${inventory.quantity} ${inventory.product.baseUnitCode}`;

            if (requestedUnitCode && requestedUnitCode !== inventory.product.baseUnitCode) {
                availableInRequestedUnit = await this.convertFromBaseUnit(
                    inventory.quantity,
                    requestedUnitCode
                );

                message = `Insufficient stock. Available: ${availableInRequestedUnit} ${requestedUnitCode} (${inventory.quantity} ${inventory.product.baseUnitCode})`;
            }

            const error = new Error(message);
            error.code = 'INSUFFICIENT_STOCK';
            error.availableQuantity = inventory.quantity;
            error.availableInBaseUnit = inventory.quantity;
            error.availableInRequestedUnit = availableInRequestedUnit;
            error.baseUnitCode = inventory.product.baseUnitCode;
            error.requestedUnitCode = requestedUnitCode;

            throw error;
        }

        return true;
    },

    async getAvailableStockInfo(productId, targetUnitCode = null) {
        const inventory = await prisma.inventory.findUnique({
            where: { productId },
            include: {
                product: {
                    include: { unit: true }
                }
            }
        });

        if (!inventory) {
            return null;
        }

        const result = {
            baseUnit: {
                quantity: inventory.quantity,
                unitCode: inventory.product.baseUnitCode
            },
            availableInTargetUnit: null
        };

        if (targetUnitCode && targetUnitCode !== inventory.product.baseUnitCode) {
            const convertedQuantity = await this.convertFromBaseUnit(
                inventory.quantity,
                targetUnitCode
            );

            result.availableInTargetUnit = {
                quantity: convertedQuantity,
                unitCode: targetUnitCode
            };
        }

        return result;
    },

};

module.exports = orderUtils;