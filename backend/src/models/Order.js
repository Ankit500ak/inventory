/**
 * Order Model
 * Represents the Order entity
 */
class Order {
  constructor(id, productId, quantity, status, createdAt = null) {
    this.id = id;
    this.productId = productId;
    this.quantity = quantity;
    this.status = status; // 'PENDING', 'CONFIRMED', 'FAILED'
    this.createdAt = createdAt;
  }

  /**
   * Mark order as confirmed
   */
  confirm() {
    this.status = 'CONFIRMED';
  }

  /**
   * Mark order as failed
   */
  fail() {
    this.status = 'FAILED';
  }

  /**
   * Check if order is confirmed
   * @returns {boolean}
   */
  isConfirmed() {
    return this.status === 'CONFIRMED';
  }

  /**
   * Check if order is failed
   * @returns {boolean}
   */
  isFailed() {
    return this.status === 'FAILED';
  }
}

module.exports = Order;
