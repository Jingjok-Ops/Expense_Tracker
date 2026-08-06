const mysql = require('mysql2/promise');

let pool = null;

function createPool() {
  if (pool) {
    return pool;
  }

  const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DATABASE = 'finflow'
  } = process.env;

  pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    decimalNumbers: true
  });

  return pool;
}

async function pingDatabase() {
  const connectionPool = createPool();
  const connection = await connectionPool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

async function query(sql, params = []) {
  const connectionPool = createPool();
  const [rows] = await connectionPool.execute(sql, params);
  return rows;
}

module.exports = {
  createPool,
  pingDatabase,
  query
};
