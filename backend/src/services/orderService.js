const pool = require('../config/database');
const productRepository = require('../repositories/productRepository');
const orderRepository = require('../repositories/orderRepository');
const Order = require('../models/Order');

/**
 * OrderService - Contains all business logic for order processing
 * 
 * KEY FEATURE: Uses PostgreSQL transactions with FOR UPDATE locks to handle
 * concurrent requests safely. This prevents race conditions where multiple
 * requests could read the same stock level simultaneously and create orders
 * that exceed available inventory.
 */
class OrderService {
  /**
   * Place a new order with atomic transaction
   * 
   * CONCURRENCY HANDLING:
   * 1. Uses BEGIN TRANSACTION with isolation level
   * 2. Acquires FOR UPDATE lock on product row before reading stock
   * 3. Checks stock availability (prevents negative stock)
   * 4. Deducts stock atomically
   * 5. Creates order record
   * 6. Commits transaction if all succeed, rolls back on any failure
   * 
   * This ensures that even with 100 concurrent requests for 5 items,
   * only 5 items will be allocated correctly.
   *
   * @param {number} productId - The product ID
   * @param {number} quantity - Quantity to order
   * @returns {Promise<object>} Result with order data or error
   */
  async placeOrder(productId, quantity) {
    const client = await pool.connect();

    try {
      // Start transaction
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

      // Step 1: Validate product exists and get lock on it
      const product = await productRepository.findByIdWithLock(productId, client);

      if (!product) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Product not found',
          code: 'PRODUCT_NOT_FOUND',
          statusCode: 404,
        };
      }

      // Step 2: Validate requested quantity
      if (quantity <= 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Quantity must be greater than 0',
          code: 'INVALID_QUANTITY',
          statusCode: 400,
        };
      }

      // Step 3: Check if sufficient stock is available
      // This is the CRITICAL EDGE CASE handling:
      // If product stock = 5:
      // - Order 1: quantity 3 → success (stock becomes 2)
      // - Order 2: quantity 3 → FAILS (stock is only 2, not 3)
      if (product.stock < quantity) {
        await client.query('ROLLBACK');
        return {
          success: false,
          error: `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`,
          code: 'INSUFFICIENT_STOCK',
          statusCode: 400,
          availableStock: product.stock,
        };
      }

      // Step 4: Deduct stock from inventory
      const stockDeducted = await productRepository.deductStock(productId, quantity, client);

      if (!stockDeducted) {
        // This should never happen due to FOR UPDATE lock, but added as safety
        await client.query('ROLLBACK');
        return {
          success: false,
          error: 'Failed to deduct stock (race condition detected)',
          code: 'STOCK_DEDUCTION_FAILED',
          statusCode: 500,
        };
      }

      // Step 5: Create order record
      const order = await orderRepository.create(productId, quantity, 'CONFIRMED', client);

      // Step 6: Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        order: {
          id: order.id,
          productId: order.product_id,
          quantity: order.quantity,
          status: order.status,
          createdAt: order.created_at,
        },
        message: 'Order created successfully',
        statusCode: 201,
      };
    } catch (error) {
      // Rollback on any error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }

      console.error('Order placement error:', error);
      return {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get order details
   * @param {number} orderId - Order ID
   * @returns {Promise<object>}
   */
  async getOrder(orderId) {
    try {
      const order = await orderRepository.findById(orderId);
      if (!order) {
        return {
          success: false,
          error: 'Order not found',
          statusCode: 404,
        };
      }
      return {
        success: true,
        order,
        statusCode: 200,
      };
    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }

  /**
   * Get all orders
   * @returns {Promise<object>}
   */
  async getAllOrders() {
    try {
      const orders = await orderRepository.findAll();
      return {
        success: true,
        orders,
        count: orders.length,
        statusCode: 200,
      };
    } catch (error) {
      console.error('Get all orders error:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }

  /**
   * Get product details with current stock
   * @param {number} productId - Product ID
   * @returns {Promise<object>}
   */
  async getProduct(productId) {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
          statusCode: 404,
        };
      }
      return {
        success: true,
        product: {
          id: product.id,
          name: product.name,
          stock: product.stock,
          createdAt: product.created_at,
        },
        statusCode: 200,
      };
    } catch (error) {
      console.error('Get product error:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }

  /**
   * Get all products
   * @returns {Promise<object>}
   */
  async getAllProducts() {
    try {
      const products = await productRepository.findAll();
      return {
        success: true,
        products,
        count: products.length,
        statusCode: 200,
      };
    } catch (error) {
      console.error('Get all products error:', error);
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500,
      };
    }
  }
}

module.exports = new OrderService();
