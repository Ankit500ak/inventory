const pool = require('../config/database');

/**
 * ProductRepository - Handles all database operations for products
 */
class ProductRepository {
  /**
   * Find product by ID with FOR UPDATE lock to prevent race conditions
   * @param {number} productId - The product ID
   * @param {object} client - Database client for transaction
   * @returns {Promise<object>} Product object or null
   */
  async findByIdWithLock(productId, client) {
    const query = 'SELECT * FROM products WHERE id = $1 FOR UPDATE';
    const result = await client.query(query, [productId]);
    return result.rows[0] || null;
  }

  /**
   * Get product by ID (without lock, for read-only operations)
   * @param {number} productId - The product ID
   * @returns {Promise<object>} Product object or null
   */
  async findById(productId) {
    const query = 'SELECT * FROM products WHERE id = $1';
    const result = await pool.query(query, [productId]);
    return result.rows[0] || null;
  }

  /**
   * Update product stock within a transaction
   * @param {number} productId - The product ID
   * @param {number} quantityToDeduct - Quantity to deduct from stock
   * @param {object} client - Database client for transaction
   * @returns {Promise<boolean>} True if successful
   */
  async deductStock(productId, quantityToDeduct, client) {
    const query = `
      UPDATE products 
      SET stock = stock - $1 
      WHERE id = $2 AND stock >= $1
      RETURNING stock
    `;
    const result = await client.query(query, [quantityToDeduct, productId]);
    return result.rowCount > 0;
  }

  /**
   * Get all products
   * @returns {Promise<array>} Array of products
   */
  async findAll() {
    const query = 'SELECT * FROM products ORDER BY id';
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Create a new product
   * @param {string} name - Product name
   * @param {number} stock - Initial stock quantity
   * @returns {Promise<object>} Created product
   */
  async create(name, stock) {
    const query = 'INSERT INTO products (name, stock) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [name, stock]);
    return result.rows[0];
  }
}

module.exports = new ProductRepository();
