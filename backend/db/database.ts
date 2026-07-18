import pg, { Pool, PoolConfig } from 'pg';

// PostgreSQL returns BIGINT (COUNT(*)) and NUMERIC (SUM) as strings by default.
// Parse them as Numbers — safe for the scale of this app.
pg.types.setTypeParser(20, (v: string | null) => (v == null ? null : Number(v))); // int8 / bigint
pg.types.setTypeParser(1700, (v: string | null) => (v == null ? null : Number(v))); // numeric / decimal

let pool: Pool | null = null;

// Convert MySQL-style "?" placeholders into PostgreSQL "$N" placeholders so the
// route files can keep using the familiar "?" syntax without per-query renumbering.
function formatQuery(sql: string, params: any[]): string {
  if (!Array.isArray(params) || params.length === 0) return sql;
  let i = 0;
  let inString = false;
  let result = '';
  for (let char of sql) {
    if (char === "'") inString = !inString;
    if (char === '?' && !inString) {
      result += `$${++i}`;
    } else {
      result += char;
    }
  }
  return result;
}

function buildConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    const cfg: PoolConfig = { connectionString: process.env.DATABASE_URL };
    if (process.env.DB_SSL === '1') cfg.ssl = { rejectUnauthorized: false };
    return cfg;
  }
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME;
  if (!host || !user || !dbName) {
    throw new Error(
      'Database is not configured. Set either DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME environment variables ' +
      `(currently: DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'MISSING'}, DB_HOST=${host ? 'set' : 'MISSING'}, DB_USER=${user ? 'set' : 'MISSING'}, DB_NAME=${dbName ? 'set' : 'MISSING'}).`
    );
  }
  const cfg: PoolConfig = {
    host,
    port: parseInt(process.env.DB_PORT || '5432'),
    user,
    password,
    database: dbName,
  };
  if (process.env.DB_SSL === '1') cfg.ssl = { rejectUnauthorized: false };
  return cfg;
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const cfg = buildConfig();
  pool = new Pool({ ...cfg, max: 10 });
  // verify connectivity early with a clear error
  const client = await pool.connect();
  client.release();
  return pool;
}

async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = await getPool();
  const { rows } = await p.query(formatQuery(sql, params), params);
  return rows;
}

async function get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

async function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return query<T>(sql, params);
}

async function run(sql: string, params: any[] = []): Promise<void> {
  await query(sql, params);
}

async function insert(sql: string, params: any[] = []): Promise<number | null> {
  const p = await getPool();
  const returning = /\bRETURNING\b/i.test(sql) ? sql : `${sql} RETURNING id`;
  const { rows } = await p.query(formatQuery(returning, params), params);
  return rows[0] ? rows[0].id : null;
}

export { getPool, query, get, all, run, insert };
