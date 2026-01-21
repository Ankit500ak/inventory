# Inventory Allocation System

A complete demonstration of backend architecture best practices, focusing on single API responsibility, proper separation of concerns, and race condition prevention through PostgreSQL transactions.

## 📋 Project Overview

This system implements an inventory allocation system with:
- **Single API endpoint** for order placement (`POST /order`)
- **Proper architecture** with clear separation (routes → controllers → services → repositories)
- **Concurrency handling** using PostgreSQL transactions and row-level locks
- **Frontend implementation** in React

### Key Design Principles

1. **Single Responsibility**: One API endpoint for all order operations
2. **Business Logic in Service Layer**: Controllers delegate to services, not vice versa
3. **Transaction-based Concurrency**: PostgreSQL `FOR UPDATE` locks prevent race conditions
4. **No Logic in Repositories**: Repositories only handle database access
5. **Stateless Controllers**: Controllers only validate and format I/O

---

## 📁 Folder Structure

```
InventoryAllocationSystem/
│
├── backend/                          # Node.js + Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # PostgreSQL connection pool
│   │   ├── models/
│   │   │   ├── Product.js           # Product entity
│   │   │   └── Order.js             # Order entity
│   │   ├── repositories/
│   │   │   ├── productRepository.js  # Product data access (with FOR UPDATE locks)
│   │   │   └── orderRepository.js    # Order data access
│   │   ├── services/
│   │   │   └── orderService.js      # Business logic (transactions, validation, stock deduction)
│   │   ├── controllers/
│   │   │   └── orderController.js    # HTTP request handling (NO LOGIC)
│   │   ├── routes/
│   │   │   └── orders.js            # Route definitions
│   │   └── middleware/
│   │       └── errorHandler.js      # Error handling middleware
│   ├── scripts/
│   │   ├── migrate.js               # Database setup script
│   │   └── setup.js                 # Initial setup script
│   ├── index.js                     # Express app entry point
│   ├── package.json                 # Dependencies
│   └── .env                         # Environment configuration
│
├── frontend-react/                   # React Frontend
│   ├── src/
│   │   ├── App.js                   # Main React component
│   │   ├── App.css                  # Styling
│   │   └── index.js                 # React entry point
│   ├── public/
│   │   └── index.html               # HTML template
│   ├── package.json                 # React dependencies
│   └── README.md                    # React setup instructions
│
├── .gitignore                        # Git ignore rules
├── README.md                         # This file
└── STARTUP.md                        # Startup and deployment guide
```

---

## 🗄️ Database Schema

### Products Table
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Orders Table
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Specification

### Primary Endpoint: POST /order

**Purpose**: Place a new order with atomic transaction processing

**Request**:
```json
POST /api/order
Content-Type: application/json

{
  "productId": 1,
  "quantity": 3
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "order": {
    "id": 1,
    "productId": 1,
    "quantity": 3,
    "status": "CONFIRMED",
    "createdAt": "2024-01-21T10:30:00Z"
  },
  "message": "Order created successfully"
}
```

**Failure Response (400/404/500)**:
```json
{
  "success": false,
  "error": "Insufficient stock. Available: 2, Requested: 3",
  "code": "INSUFFICIENT_STOCK",
  "availableStock": 2
}
```

### Additional Monitoring Endpoints

- `GET /api/products` - List all products with current stock
- `GET /api/products/:id` - Get specific product
- `GET /api/orders` - List all orders with product details
- `GET /api/orders/:id` - Get specific order

---

## 🔒 Race Condition Prevention

### The Problem: Race Condition Scenario

**Scenario**: Product stock = 5

```
Timeline:
T1: Request A reads stock = 5 ✓
T2: Request B reads stock = 5 ✓
T3: Request A deducts 3 → stock = 2 ✓
T4: Request B deducts 3 → stock = -1 ✗ (NEGATIVE STOCK!)
```

### The Solution: PostgreSQL Transactions with FOR UPDATE

**Implementation in `orderService.js`**:

```javascript
async placeOrder(productId, quantity) {
  const client = await pool.connect();
  
  try {
    // 1. Start transaction with SERIALIZABLE isolation
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    
    // 2. Acquire exclusive lock on product row
    //    This prevents other transactions from reading stale stock
    const product = await productRepository.findByIdWithLock(productId, client);
    
    // 3. Check stock against LOCKED row (always current)
    if (product.stock < quantity) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Insufficient stock' };
    }
    
    // 4. Deduct stock atomically
    const stockDeducted = await productRepository.deductStock(productId, quantity, client);
    
    // 5. Create order record
    const order = await orderRepository.create(productId, quantity, 'CONFIRMED', client);
    
    // 6. Commit all changes or rollback on error
    await client.query('COMMIT');
    return { success: true, order };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Key Mechanisms**:

1. **FOR UPDATE Lock**: `SELECT * FROM products WHERE id = $1 FOR UPDATE`
   - Acquires an exclusive lock on the product row
   - Other transactions must wait for this lock
   - Prevents dirty reads

2. **SERIALIZABLE Isolation Level**:
   - Highest isolation level
   - Transactions appear as if executed one-by-one
   - Detects and prevents serialization conflicts

3. **Atomic Operations**:
   - All steps (check → deduct → create) happen together
   - If any step fails, everything rolls back
   - Stock can never be negative

### Corrected Timeline with FOR UPDATE:

```
T1: Request A BEGIN, LOCK product (FOR UPDATE) → stock = 5
T2: Request B BEGIN, WAIT for lock (blocked)
T3: Request A: stock 5 >= 3 ✓
T4: Request A: deduct 3 → stock = 2
T5: Request A: COMMIT
T6: Request B: LOCK acquired → stock = 2 (current)
T7: Request B: stock 2 < 3 ✗ FAIL (CORRECT!)
T8: Request B: ROLLBACK
```

---

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 16+
- PostgreSQL 12+
- React 18+ (for frontend)
- Flutter (for mobile frontend)

### Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Run database migration
npm run migrate

# 4. Start the server
npm start
# Server runs on http://localhost:3000
```

### React Frontend Setup

```bash
cd frontend-react

# 1. Install dependencies
npm install

# 2. Start development server
npm start
# Opens on http://localhost:3000 (React dev server)
# API requests proxy to http://localhost:3000/api
```

### Flutter Setup

```bash
cd frontend-flutter

# 1. Get dependencies
flutter pub get

# 2. Run on device/emulator
flutter run

# Note: Update API_URL in main.dart if backend is on different host
```

---

## 📊 Testing Concurrency

### Stress Test: Concurrent Orders

Use this script to test race condition prevention:

```bash
# Create a product with 5 items
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 3}'

# Send 10 concurrent requests for 2 items each (total 20 requested)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/order \
    -H "Content-Type: application/json" \
    -d '{"productId": 1, "quantity": 2}' &
done
wait

# Result: Only 3 orders succeed (5 items / 2 per order = 2.5 → 2 succeed + 1 partial)
# Remaining requests fail with "Insufficient stock"
```

### Expected Behavior

With stock = 5:
- ✅ Order 1: Quantity 3 → SUCCESS (stock: 5 → 2)
- ❌ Order 2: Quantity 3 → FAIL (stock: 2, need: 3)
- ✅ Order 3: Quantity 2 → SUCCESS (stock: 2 → 0)
- ❌ Order 4: Quantity 2 → FAIL (stock: 0, need: 2)

---

## 🎯 Why Single API Design?

### Problem with Multiple Endpoints

❌ **WRONG APPROACH** (Multiple endpoints):
```
POST /products/:id/reserve
POST /orders/create
POST /orders/:id/confirm
DELETE /reservations/:id
```

**Issues**:
- Distributed logic across endpoints
- Race conditions between endpoints
- Difficult to maintain transaction atomicity
- Multiple points of failure

### Correct Approach: Single Endpoint

✅ **RIGHT APPROACH** (Single endpoint):
```
POST /order
```

**Advantages**:
- Single transaction scope
- All logic in one place (service layer)
- Atomic guarantee
- Easy to test and debug
- Clear API contract

---

## 🏗️ Architecture Patterns

### 1. Layered Architecture

```
Request
   ↓
Controller (HTTP validation only)
   ↓
Service (Business logic, transactions)
   ↓
Repository (Data access layer)
   ↓
Database
```

### 2. Separation of Concerns

**Controller** (`orderController.js`):
- Parse request body
- Validate request format
- Call service
- Format response

**Service** (`orderService.js`):
- Business rules
- Transaction management
- Stock validation
- Error handling

**Repository** (`productRepository.js`, `orderRepository.js`):
- Database queries
- Raw data access
- No business logic

### 3. Transaction Management

All state-changing operations use transactions:
```javascript
BEGIN TRANSACTION
  LOCK product FOR UPDATE
  CHECK stock
  DEDUCT stock
  CREATE order
COMMIT / ROLLBACK
```

---

## 📝 Implementation Details

### Why No Business Logic in Controller?

```javascript
// ❌ WRONG - Business logic in controller
app.post('/order', (req, res) => {
  if (product.stock < quantity) {  // ← Business logic here!
    return res.status(400).json({ error: 'Insufficient stock' });
  }
  // ...
});

// ✅ CORRECT - Business logic in service
app.post('/order', (req, res) => {
  const result = await orderService.placeOrder(productId, quantity);
  res.status(result.statusCode).json(result);
});
```

### Why FOR UPDATE Lock?

```sql
-- ❌ WITHOUT FOR UPDATE (Race condition possible)
SELECT stock FROM products WHERE id = 1;  -- returns 5
-- Meanwhile, another transaction deducts stock...
UPDATE products SET stock = stock - 3 WHERE id = 1;

-- ✅ WITH FOR UPDATE (Race condition prevented)
SELECT * FROM products WHERE id = 1 FOR UPDATE;  -- locks row
-- Other transactions must wait...
UPDATE products SET stock = stock - 3 WHERE id = 1;
```

---

## 🔑 Key Learnings

1. **Single Endpoint Principle**:
   - One endpoint = one transaction
   - Easier to reason about
   - Prevents distributed consistency issues

2. **Service Layer Ownership**:
   - Controllers are thin
   - Services own business logic
   - Repositories own data access

3. **Transaction Atomicity**:
   - Use database transactions
   - Lock critical rows
   - Rollback on failure

4. **Frontend Agnostic**:
   - Same API works for React, Flutter, etc.
   - No UI-specific code in backend
   - Clean separation

---

## 📞 Troubleshooting

### Backend won't start
```bash
# Check if PostgreSQL is running
# Check .env configuration
# Check port 3000 is not in use
```

### React can't connect to API
```bash
# Check backend is running on http://localhost:3000
# Check CORS headers are being sent
# Check network tab in browser DevTools
```

### Flutter network errors
```bash
# For Android emulator: Use http://10.0.2.2:3000/api
# For iOS simulator: Use http://localhost:3000/api
# For physical device: Use your machine's IP address
```

---

## 🚀 Future Enhancements

- Add authentication/authorization
- Implement order status updates
- Add order cancellation
- Implement pagination for large datasets
- Add monitoring and analytics
- Implement caching layer
- Add load balancing for horizontal scaling

---

## 📚 References

- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Row-Level Locks](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [React Hooks](https://react.dev/reference/react/hooks)
- [Flutter State Management](https://flutter.dev/docs/development/data-and-backend/state-mgmt)


