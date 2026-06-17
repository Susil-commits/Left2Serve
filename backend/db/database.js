import mysql from 'mysql2/promise';

let pool = null;

async function getPool() {
  if (pool) return pool;
  const baseConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4'
  };
  const dbName = process.env.DB_NAME;
  const tempConn = await mysql.createConnection(baseConfig);
  await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await tempConn.end();
  pool = mysql.createPool({ ...baseConfig, database: dbName, waitForConnections: true, connectionLimit: 10 });
  return pool;
}

async function query(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function all(sql, params = []) {
  return query(sql, params);
}

async function run(sql, params = []) {
  await query(sql, params);
}

async function insert(sql, params = []) {
  const p = await getPool();
  const [result] = await p.execute(sql, params);
  return result.insertId;
}

export { getPool, query, get, all, run, insert };