require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'healthcare_db',
    multipleStatements: true
  });

  try {
    console.log('Migrating Firebase to Supabase schema...');
    await connection.query(`
      ALTER TABLE medical_report 
      RENAME COLUMN firebase_path TO storage_path,
      RENAME COLUMN firebase_url TO storage_url;
    `);
    console.log('Schema updated successfully.');
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Columns already renamed.');
    } else {
      console.error('Error updating schema:', err);
    }
  } finally {
    await connection.end();
  }
}

run();
