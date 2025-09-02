const express = require('express');
const sellerOrderService = require('../services/orderService');
const { authenticateToken, requireRole } = require('../../../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireRole(['supplier']));

router.patch('/orders/:id/status', async (req, res, next) => {
    try {
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Status is required'
            });
        }

        const validStatuses = ['APPROVED', 'FULFILLED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        const order = await sellerOrderService.updateOrderStatus(
            req.params.id,
            req.user.id,
            status,
            reason
        );

        res.json({
            message: `Order ${status.toLowerCase()} successfully`,
            data: order
        });
    } catch (error) {
        next(error);
    }
});

router.get('/orders/:id', async (req, res, next) => {
    try {
        const order = await sellerOrderService.getOrderDetail(req.params.id, req.user.id);
        res.json({
            message: 'Order details retrieved successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;