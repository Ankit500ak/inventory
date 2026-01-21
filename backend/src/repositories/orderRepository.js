const pool = require('../config/database');

/**
 * OrderRepository - Handles all database operations for orders
 */
class OrderRepository {
  /**
   * Create a new order
   * @param {number} productId - Product ID
   * @param {number} quantity - Order quantity
   * @param {string} status - Order status
   * @param {object} client - Database client for transaction
   * @returns {Promise<object>} Created order
   */
  async create(productId, quantity, status, client) {
    const query = `
      INSERT INTO orders (product_id, quantity, status, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [productId, quantity, status]);
    return result.rows[0];
  }

  /**
   * Get order by ID
   * @param {number} orderId - Order ID
   * @returns {Promise<object>} Order object or null
   */
  async findById(orderId) {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [orderId]);
    return result.rows[0] || null;
  }

  /**
   * Get all orders with product details
   * @returns {Promise<array>} Array of orders
   */
  async findAll() {
    const query = `
      SELECT 
        o.id,
        o.product_id,
        o.quantity,
        o.status,
        o.created_at,
        p.name as product_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get orders by product ID
   * @param {number} productId - Product ID
   * @returns {Promise<array>} Array of orders
   */
  async findByProductId(productId) {
    const query = 'SELECT * FROM orders WHERE product_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [productId]);
    return result.rows;
  }

  /**
   * Update order status
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @param {object} client - Database client for transaction (optional)
   * @returns {Promise<object>} Updated order
   */
  async updateStatus(orderId, status, client = null) {
    const queryClient = client || pool;
    const query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
    const result = await queryClient.query(query, [status, orderId]);
    return result.rows[0];
  }
}

module.exports = new OrderRepository();
