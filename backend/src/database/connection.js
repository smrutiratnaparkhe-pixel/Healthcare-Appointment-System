const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  connectionLimit: config.database.connectionLimit,
  waitForConnections: config.database.waitForConnections,
  queueLimit: config.database.queueLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
});

// Test connection
pool.getConnection()
  .then((conn) => {
    console.log('✅ MySQL Database connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ MySQL Database connection failed:', err.message);
  });

module.exports = pool;
