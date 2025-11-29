// server.js
import express from 'express';
import postgres from 'postgres';
import dotenv from 'dotenv';
import AdminAuth from './adminAuth/AdminAuth.js'; // Your auth routes
import { createAdminUsers } from './utils/GenerateAdmin.js';

dotenv.config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Connect to Supabase Postgres
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

// Test connection and optionally create admin users
async function testConnection() {
  try {
    const result = await sql`SELECT now() AS current_time`;
    console.log('Connected to database. Current time:', result[0].current_time);

    // Uncomment if you want to create default admin users
    // await createAdminUsers();
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Mount Admin auth routes
app.use('/admin/auth', AdminAuth);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  testConnection();
});
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await sql`SELECT now() AS current_time`;
    res.status(200).json({
      status: 'OK',
      dbTime: result[0].current_time,
      message: 'Server is up and database is connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});
