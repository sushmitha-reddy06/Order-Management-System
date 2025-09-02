require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const { swaggerUi, specs } = require('../lib/swagger');

const authRoutes = require('../src/auth/routes/authroute');
const sellerRoutes = require('../src/sellers/routes/productRoutes');
const sellerOrderRoutes = require('../src/sellers/routes/orderRoutes');
const publicProductRoutes = require('../src/sellers/routes/publicProductRoutes');
const buyerRoutes = require('../src/buyers/routes/orderRoutes');
const adminRoutes = require('../src/admin/routes/adminRoutes');

const { errorHandler } = require('../middlewares/errorHandler');

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

app.use('/api/auth', authRoutes)
    .use('/api/seller', sellerRoutes)
    .use('/api/seller', sellerOrderRoutes)
    .use('/api/public', publicProductRoutes) //seller and buyer can access this services
    .use('/api/buyer', buyerRoutes)
    .use('/api/admin', adminRoutes);


app.use(errorHandler);



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 OMS Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// SWAGGER
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

module.exports = app;