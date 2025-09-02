const express = require('express');
const productService = require('../services/productService');
const { authenticateToken, requireRole } = require('../../../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireRole(['supplier']));

router.post('/addProducts', async (req, res, next) => {
    try {
        const product = await productService.createProduct(req.body, req.user.id);
        res.status(201).json({
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
});

router.get('/getAllProducts', async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await productService.getSupplierProducts(req.user.id, parseInt(page), parseInt(limit));
        res.json({
            message: 'Products retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/getProductById/:id', async (req, res, next) => {
    try {
        console.log('req.params.id', req.params.id)
        const product = await productService.getProduct(req.params.id, req.user.id);
        res.json({
            message: 'Product retrieved successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
});

router.put('/updateProduct/:id', async (req, res, next) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.user.id, req.body);
        res.json({
            message: 'Product updated successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/deleteProduct/:id', async (req, res, next) => {
    try {
        await productService.deleteProduct(req.params.id, req.user.id);
        res.json({
            message: 'Product deleted successfully'
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/updateStockProduct/:id/stock', async (req, res, next) => {
    try {
        const { delta_base } = req.body;

        if (delta_base === undefined) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'delta_base is required'
            });
        }

        const inventory = await productService.updateInventory(req.params.id, req.user.id, parseFloat(delta_base));
        res.json({
            message: 'Inventory updated successfully',
            data: inventory
        });
    } catch (error) {
        next(error);
    }
});

router.get('/getOrders', async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const result = await productService.getSupplierOrders(req.user.id, status, parseInt(page), parseInt(limit));
        res.json({
            message: 'Orders retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;