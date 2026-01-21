/**
 * Product Model
 * Represents the Product entity
 */
class Product {
  constructor(id, name, stock, createdAt = null) {
    this.id = id;
    this.name = name;
    this.stock = stock;
    this.createdAt = createdAt;
  }

  /**
   * Check if product has sufficient stock
   * @param {number} quantity - Quantity to check
   * @returns {boolean}
   */
  hasSufficientStock(quantity) {
    return this.stock >= quantity;
  }

  /**
   * Get available stock
   * @returns {number}
   */
  getAvailableStock() {
    return this.stock;
  }
}

module.exports = Product;
