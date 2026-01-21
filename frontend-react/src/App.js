import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

/**
 * OrderForm Component - Handles order placement via API
 * 
 * This frontend component:
 * 1. Displays available products
 * 2. Allows user to select product and quantity
 * 3. Sends order request to the SINGLE API endpoint: POST /api/order
 * 4. Handles responses and displays results
 * 
 * IMPORTANT: No business logic is here
 * - All validation is done server-side
 * - Stock checking is done server-side
 * - Only the API sends the order
 */
function OrderForm() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState([]);
  const API_URL = 'http://localhost:3000/api';

  // Fetch available products on component mount
  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      if (response.data.success) {
        setProducts(response.data.products);
        if (response.data.products.length > 0) {
          setSelectedProduct(response.data.products[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setMessage('Failed to load products - Backend may not be running');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders`);
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  /**
   * Handle order submission
   * Sends POST request to the ONLY API endpoint
   */
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(`${API_URL}/order`, {
        productId: parseInt(selectedProduct),
        quantity: parseInt(quantity),
      });

      if (response.data.success) {
        setMessage(`✅ Order placed successfully! Order ID: ${response.data.order.id}`);
        setQuantity(1);
        // Refresh products and orders
        fetchProducts();
        fetchOrders();
      } else {
        setMessage(`❌ Order failed: ${response.data.error}`);
      }
    } catch (error) {
      if (error.response?.data?.error) {
        setMessage(`❌ Error: ${error.response.data.error}`);
      } else {
        setMessage('❌ Network error. Please check if the backend is running.');
      }
      console.error('Order submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentProduct = products.find(p => p.id === parseInt(selectedProduct));

  return (
    <div className="app-container">
      <header className="header">
        <h1>📦 Inventory Allocation System</h1>
        <p>Simple order management with race condition prevention</p>
      </header>

      <main className="main-content">
        <div className="container">
          {/* Order Form Section */}
          <section className="section form-section">
            <h2>Place New Order</h2>
            <form onSubmit={handleSubmitOrder} className="order-form">
              <div className="form-group">
                <label htmlFor="product">Select Product:</label>
                <select
                  id="product"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  disabled={loading || products.length === 0}
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={currentProduct?.stock || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={loading}
                />
                {currentProduct && (
                  <small className="stock-info">Available: {currentProduct.stock}</small>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedProduct || products.length === 0}
                className="btn-submit"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </form>

            {message && (
              <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
          </section>

          {/* Product Status Section */}
          <section className="section products-section">
            <h2>Product Inventory</h2>
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  <h3>{product.name}</h3>
                  <div className="stock-display">
                    <span className="stock-number">{product.stock}</span>
                    <span className="stock-label">in stock</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Orders History Section */}
          <section className="section orders-section">
            <h2>Recent Orders</h2>
            <div className="orders-list">
              {orders.length === 0 ? (
                <p className="no-orders">No orders yet</p>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.product_name}</td>
                        <td>{order.quantity}</td>
                        <td><span className="status-badge">{order.status}</span></td>
                        <td>{new Date(order.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default OrderForm;
