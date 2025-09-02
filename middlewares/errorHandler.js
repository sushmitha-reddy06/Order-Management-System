function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            error: 'Token expired',
            message: 'Please login again'
        });
    }

    if (err.isJoi) {
        return res.status(400).json({
            error: 'Validation failed',
            details: err.details
        });
    }

    if (err.code === '23505') {
        return res.status(409).json({
            error: 'Duplicate entry',
            message: 'Resource already exists'
        });
    }

    if (err.code === 'INSUFFICIENT_STOCK') {
        return res.status(409).json({
            error: 'Insufficient stock',
            message: err.message,
            details: {
                availableQuantity: err.availableInRequestedUnit,
                availableUnit: err.requestedUnitCode,
                baseAvailableQuantity: err.availableInBaseUnit,
                baseUnit: err.baseUnitCode
            }
        });
    }

    if (err.code === 'MULTIPLE_STOCK_ERRORS') {
        return res.status(409).json({
            error: 'Insufficient stock for multiple products',
            message: 'Some products have insufficient stock',
            details: {
                stockErrors: err.stockErrors
            }
        });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(status).json({
        error: err.name || 'Error',
        message: process.env.NODE_ENV === 'production' ? message : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });


}

module.exports = { errorHandler };