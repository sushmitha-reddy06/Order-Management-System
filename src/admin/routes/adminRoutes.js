const express = require('express');
const adminService = require('../services/adminService');
const { authenticateToken, requireRole } = require('../../../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireRole(['admin']));

router.get('/users', async (req, res, next) => {
    try {
        const { role, is_active, page = 1, limit = 10 } = req.query;
        const result = await adminService.getAllUsers(role, is_active, parseInt(page), parseInt(limit));
        res.json({
            message: 'Users retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/users/:id', async (req, res, next) => {
    try {
        const user = await adminService.getUserById(req.params.id);
        res.json({
            message: 'User details retrieved successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/users/:id/status', async (req, res, next) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'is_active must be a boolean'
            });
        }

        const user = await adminService.updateUserStatus(req.params.id, is_active);
        res.json({
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: user
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/users/:id', async (req, res, next) => {
    try {
        const user = await adminService.deleteUser(req.params.id);
        res.json({
            message: 'User deleted successfully',
            data: user
        });
    } catch (error) {
        next(error);
    }
});

router.get('/orders', async (req, res, next) => {
    try {
        const { status, supplier_id, buyer_id, page = 1, limit = 10 } = req.query;
        const result = await adminService.getAllOrders(status, supplier_id, buyer_id, parseInt(page), parseInt(limit));
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
        const order = await adminService.getOrderById(req.params.id);
        res.json({
            message: 'Order details retrieved successfully',
            data: order
        });
    } catch (error) {
        next(error);
    }
});

router.get('/products', async (req, res, next) => {
    try {
        const { supplier_id, category, in_stock, page = 1, limit = 10 } = req.query;
        const result = await adminService.getAllProducts(supplier_id, category, in_stock, parseInt(page), parseInt(limit));
        res.json({
            message: 'Products retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/analytics', async (req, res, next) => {
    try {
        const analytics = await adminService.getAnalytics();
        res.json({
            message: 'Analytics retrieved successfully',
            data: analytics
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;