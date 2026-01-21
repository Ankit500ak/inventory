const { Client } = require('pg');
require('dotenv').config();

/**
 * Database Setup Script
 * Creates the database if it doesn't exist
 */
async function setup() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME]
    );

    if (result.rows.length === 0) {
      console.log(`Creating database: ${process.env.DB_NAME}`);
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`✅ Database already exists: ${process.env.DB_NAME}`);
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

setup().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
