const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OMS API',
            version: '1.0.0',
            description: 'Order Management System API documentation',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://yourdomain.com/api'
                    : 'http://localhost:3000/',
            },
        ],
    },
    apis: ['./swagger/*.yaml', './src/**/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
