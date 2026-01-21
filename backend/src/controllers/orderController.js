const orderService = require('../services/orderService');

/**
 * OrderController - Handles HTTP requests and delegates to service layer
 * 
 * IMPORTANT: The controller does NOT contain any business logic.
 * It only:
 * 1. Validates request format
 * 2. Calls service methods
 * 3. Formats and sends responses
 */
class OrderController {
  /**
   * Place a new order
   * POST /order
   *
   * Request body:
   * {
   *   "productId": number,
   *   "quantity": number
   * }
   *
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async placeOrder(req, res) {
    const { productId, quantity } = req.body;

    // Validate request
    if (productId === undefined || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'productId and quantity are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
    }

    if (typeof productId !== 'number' || productId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'productId must be a positive number',
        code: 'INVALID_PRODUCT_ID',
      });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'quantity must be a positive number',
        code: 'INVALID_QUANTITY',
      });
    }

    // Call service
    const result = await orderService.placeOrder(productId, quantity);

    // Send response
    res.status(result.statusCode).json({
      success: result.success,
      ...(result.order && { order: result.order }),
      ...(result.error && { error: result.error }),
      ...(result.code && { code: result.code }),
      ...(result.availableStock !== undefined && { availableStock: result.availableStock }),
      ...(result.message && { message: result.message }),
    });
  }

  /**
   * Get all orders (for testing/monitoring)
   * GET /orders
   *
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAllOrders(req, res) {
    const result = await orderService.getAllOrders();
    res.status(result.statusCode).json(result);
  }

  /**
   * Get all products (for testing/monitoring)
   * GET /products
   *
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAllProducts(req, res) {
    const result = await orderService.getAllProducts();
    res.status(result.statusCode).json(result);
  }

  /**
   * Get product by ID (for testing/monitoring)
   * GET /products/:id
   *
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getProduct(req, res) {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID',
      });
    }

    const result = await orderService.getProduct(parseInt(id));
    res.status(result.statusCode).json(result);
  }

  /**
   * Get order by ID (for testing/monitoring)
   * GET /orders/:id
   *
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getOrder(req, res) {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order ID',
      });
    }

    const result = await orderService.getOrder(parseInt(id));
    res.status(result.statusCode).json(result);
  }
}

module.exports = new OrderController();
