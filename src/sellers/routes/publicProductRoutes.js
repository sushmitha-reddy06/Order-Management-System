const express = require('express');
const publicProductService = require('../services/publicProductService');
const cacheMiddleware = require('../../../middlewares/cacheMiddleware');

const router = express.Router();

router.get('/products/search', async (req, res, next) => {
    try {
        const { q, supplier_id, category, min_price, max_price, in_stock, page = 1, limit = 10 } = req.query;

        const filters = {
            supplierId: supplier_id,
            category,
            minPrice: min_price,
            maxPrice: max_price,
            inStock: in_stock ? in_stock === 'true' : undefined
        };

        const result = await publicProductService.searchProducts(
            q,
            filters,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            message: 'Products search successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/getAllProducts', cacheMiddleware(120), async (req, res, next) => {
    try {
        const { supplier_id, category, page = 1, limit = 10 } = req.query;

        const filters = {
            supplierId: supplier_id,
            category
        };

        const result = await publicProductService.getAllProducts(
            parseInt(page),
            parseInt(limit),
            filters
        );

        res.json({
            message: 'Products retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/getProduct/:id', async (req, res, next) => {
    try {
        const product = await publicProductService.getProductById(req.params.id);
        res.json({
            message: 'Product retrieved successfully',
            data: product
        });
    } catch (error) {
        next(error);
    }
});

router.get('/categories/:category/products', async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await publicProductService.getProductsByCategory(
            req.params.category,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            message: 'Category products retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/categories', async (req, res, next) => {
    try {
        const categories = await publicProductService.getCategories();
        res.json({
            message: 'Categories retrieved successfully',
            data: categories
        });
    } catch (error) {
        next(error);
    }
});

router.get('/suppliers/:supplierId/products', async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const result = await publicProductService.getProductsBySupplier(
            req.params.supplierId,
            parseInt(page),
            parseInt(limit)
        );

        res.json({
            message: 'Supplier products retrieved successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;