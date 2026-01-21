# Quick Startup Guide

## Prerequisites Check

Before running the system, ensure:

1. **PostgreSQL is installed and running**
   ```bash
   # Windows
   # PostgreSQL should be running as a service
   # Start: Services app → Look for "PostgreSQL" → Start it
   ```

2. **Node.js is installed**
   ```bash
   node --version  # Should be 16+
   npm --version
   ```

3. **Ports are available**
   - Port 3000: Backend API
   - Port 3001: React dev server (usually)
   - Port 5432: PostgreSQL (default)

## Step-by-Step Startup

### Terminal 1: Backend Setup & Start

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Create .env file (copy from .env.example)
# Make sure DB credentials match your PostgreSQL setup
# Default credentials:
# DB_HOST=localhost
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_NAME=inventory_system

# 3. Run migration (creates tables)
npm run migrate

# If migration fails:
# - Check PostgreSQL is running
# - Check .env credentials are correct
# - Check database user exists

# 4. Start backend server
npm start
# Expected output:
# Inventory Allocation System API running on http://localhost:3000
```

### Terminal 2: React Frontend

```bash
cd frontend-react

# 1. Install dependencies
npm install

# 2. Start React dev server
npm start
# Opens http://localhost:3001 (or next available port)
```

## Common Issues & Solutions

### Backend won't start / 500 errors

**Problem**: Database connection failed

**Solution**:
```bash
# 1. Check PostgreSQL is running
# Windows: Services app → Find PostgreSQL → Start it

# 2. Verify .env credentials
cat backend/.env

# 3. Test database connection
psql -U postgres -d inventory_system -c "SELECT 1;"

# 4. If database doesn't exist, create it
psql -U postgres -c "CREATE DATABASE inventory_system;"

# 5. Try migration again
npm run migrate
```

### React can't fetch data

**Problem**: Backend API not responding or running on different port

**Solution**:
```bash
# 1. Check backend is running
curl http://localhost:3000/health
# Should return: { "status": "OK", ... }

# 2. If on different port, update React
# Edit frontend-react/package.json
# Change: "proxy": "http://localhost:3000/api"
# To: "proxy": "http://localhost:YOUR_PORT/api"

# 3. Restart React dev server
npm start
```

### Port already in use

**Problem**: Port 3000 or 3001 already in use

**Solution**:
```bash
# Find and kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port:
# Backend: Change API_PORT in .env
# React: Runs on next available port automatically
```

## Testing the System

Once everything is running:

```bash
# 1. Check backend health
curl http://localhost:3000/health

# 2. Get products
curl http://localhost:3000/api/products

# 3. Place an order
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'

# 4. Check React
# Open http://localhost:3001 in browser
```

## Database Reset

If something goes wrong with data:

```bash
# 1. Stop backend server (Ctrl+C)

# 2. Drop and recreate database
psql -U postgres -c "DROP DATABASE inventory_system;"
psql -U postgres -c "CREATE DATABASE inventory_system;"

# 3. Run migration again
npm run migrate

# 4. Start backend again
npm start
```
