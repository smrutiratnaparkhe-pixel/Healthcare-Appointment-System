const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config');

async function initializeDatabase() {
  let connection;
  try {
    // Connect without database first to create it
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      multipleStatements: true,
    });

    console.log('📦 Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database.name}\``);
    await connection.query(`USE \`${config.database.name}\``);

    console.log('📋 Reading schema file...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔧 Executing schema...');
    await connection.query(schema);

    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initializeDatabase();
