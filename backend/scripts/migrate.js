const pool = require('../src/config/database');

/**
 * Database Migration Script
 * Creates necessary tables and initial data
 */
async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Starting database migration...');

    // Drop existing tables (for clean setup)
    console.log('Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS products CASCADE');

    // Create products table
    console.log('Creating products table...');
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name)
      )
    `);

    // Create orders table
    console.log('Creating orders table...');
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    console.log('Creating indexes...');
    await client.query('CREATE INDEX idx_orders_product_id ON orders(product_id)');
    await client.query('CREATE INDEX idx_orders_status ON orders(status)');
    await client.query('CREATE INDEX idx_orders_created_at ON orders(created_at DESC)');

    // Insert sample data
    console.log('Inserting sample data...');
    await client.query(`
      INSERT INTO products (name, stock) VALUES
      ('Laptop', 10),
      ('Mouse', 50),
      ('Keyboard', 30),
      ('Monitor', 5),
      ('USB Cable', 100)
    `);

    console.log('✅ Migration completed successfully!');
    console.log('Sample products created:');
    const result = await client.query('SELECT * FROM products');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
