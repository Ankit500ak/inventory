const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

/**
 * PRIMARY ENDPOINT - The ONLY API endpoint for order placement
 * POST /order
 *
 * This is the single, unified endpoint for all order placement operations.
 * All business logic is handled in the service layer with proper
 * concurrency control and transaction management.
 */
router.post('/order', (req, res) => orderController.placeOrder(req, res));

// Additional endpoints for testing and monitoring (non-primary)
router.get('/orders', (req, res) => orderController.getAllOrders(req, res));
router.get('/orders/:id', (req, res) => orderController.getOrder(req, res));
router.get('/products', (req, res) => orderController.getAllProducts(req, res));
router.get('/products/:id', (req, res) => orderController.getProduct(req, res));

module.exports = router;
