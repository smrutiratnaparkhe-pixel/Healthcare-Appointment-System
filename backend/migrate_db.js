require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log("Connecting to Railway database...");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true
  });

  try {
    console.log("Reading schema.sql...");
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Executing schema queries (this might take a few seconds)...");
    await connection.query(sql);
    console.log("SUCCESS! All tables have been created in your live database.");
  } catch (error) {
    console.error("MIGRATION FAILED:", error.message);
  } finally {
    await connection.end();
  }
}

migrate();
