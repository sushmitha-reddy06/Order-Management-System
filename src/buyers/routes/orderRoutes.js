const express = require('express');
const orderService = require('../services/orderService');
const { authenticateToken, requireRole } = require('../../../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireRole(['buyer']));

router.post('/orders', async (req, res, next) => {
    try {
        const order = await orderService.placeOrder(req.body, req.user.id);
        res.status(201).json({
            message: 'Order placed successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
});

router.get('/orders', async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const result = await orderService.getBuyerOrders(req.user.id, status, parseInt(page), parseInt(limit));
        res.json({
            message: 'Orders retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/orders/:id', async (req, res, next) => {
    try {
        const order = await orderService.getOrderDetail(req.params.id, req.user.id);
        res.json({
            message: 'Order details retrieved successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/orders/:id/cancel', async (req, res, next) => {
    try {
        const { reason } = req.body;
        const order = await orderService.cancelOrder(req.params.id, req.user.id, reason);
        res.json({
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
});

router.get('/orders/statistics', async (req, res, next) => {
    try {
        const stats = await orderService.getOrderStatistics(req.user.id);
        res.json({
            message: 'Order statistics retrieved successfully',
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;