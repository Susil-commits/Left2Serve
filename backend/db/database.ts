import pg, { Pool, PoolConfig } from 'pg';

// PostgreSQL type parsers
pg.types.setTypeParser(20, (v: string | null) => (v == null ? null : Number(v))); // int8 / bigint
pg.types.setTypeParser(1700, (v: string | null) => (v == null ? null : Number(v))); // numeric / decimal

let pool: Pool | null = null;

// SQL placeholder formatting (? to $N)

function formatQuery(sql: string, params: any[]): string {
  if (!Array.isArray(params) || params.length === 0) return sql;
  // JSON operator safety check
  if (/\?\||\?&/.test(sql)) {
    throw new Error('formatQuery: SQL contains ?| or ?& JSON operators which conflict with ? placeholders. Use $N params directly.');
  }
  let i = 0;
  let inString = false;
  let result = '';
  let j = 0;
  while (j < sql.length) {
    const char = sql[j];
    if (char === "'" && !inString) {
      // Escaped quotes
      inString = true;
      result += char;
      j++;
      continue;
    }
    if (char === "'" && inString) {

      if (sql[j + 1] === "'") {
        result += "''";
        j += 2;
        continue;
      }
      inString = false;
      result += char;
      j++;
      continue;
    }
    if (char === '?' && !inString) {
      result += `$${++i}`;
    } else {
      result += char;
    }
    j++;
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
  pool = new Pool({ ...cfg, max: parseInt(process.env.DB_POOL_MAX || '10') });
  // Initial connection check
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

/**
 * Transaction wrapper
 */
async function withTransaction<T>(
  fn: (client: {
    get: typeof get;
    all: typeof all;
    run: typeof run;
    insert: typeof insert;
  }) => Promise<T>
): Promise<T> {
  const p = await getPool();
  const pgClient = await p.connect();
  try {
    await pgClient.query('BEGIN');

    const txGet = async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
      const { rows } = await pgClient.query(formatQuery(sql, params), params);
      return (rows[0] as R) || null;
    };
    const txAll = async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
      const { rows } = await pgClient.query(formatQuery(sql, params), params);
      return rows as R[];
    };
    const txRun = async (sql: string, params: any[] = []): Promise<void> => {
      await pgClient.query(formatQuery(sql, params), params);
    };
    const txInsert = async (sql: string, params: any[] = []): Promise<number | null> => {
      const returning = /\bRETURNING\b/i.test(sql) ? sql : `${sql} RETURNING id`;
      const { rows } = await pgClient.query(formatQuery(returning, params), params);
      return rows[0] ? rows[0].id : null;
    };

    const result = await fn({ get: txGet as typeof get, all: txAll as typeof all, run: txRun, insert: txInsert });
    await pgClient.query('COMMIT');
    return result;
  } catch (err) {
    await pgClient.query('ROLLBACK');
    throw err;
  } finally {
    pgClient.release();
  }
}

export { getPool, query, get, all, run, insert, withTransaction };
