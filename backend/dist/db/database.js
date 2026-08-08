import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
// PostgreSQL type parsers
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v))); // int8 / bigint
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v))); // numeric / decimal
let pool = null;
// SQL placeholder formatting (? to $N)
function formatQuery(sql, params) {
    if (!Array.isArray(params) || params.length === 0)
        return sql;
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
        }
        else {
            result += char;
        }
        j++;
    }
    return result;
}
function buildConfig() {
    if (process.env.DATABASE_URL) {
        const cfg = { connectionString: process.env.DATABASE_URL };
        if (process.env.DB_SSL === '1')
            cfg.ssl = { rejectUnauthorized: false };
        return cfg;
    }
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME;
    if (!host || !user || !dbName) {
        throw new Error('Database is not configured. Set either DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME environment variables ' +
            `(currently: DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'MISSING'}, DB_HOST=${host ? 'set' : 'MISSING'}, DB_USER=${user ? 'set' : 'MISSING'}, DB_NAME=${dbName ? 'set' : 'MISSING'}).`);
    }
    const cfg = {
        host,
        port: parseInt(process.env.DB_PORT || '5432'),
        user,
        password,
        database: dbName,
    };
    if (process.env.DB_SSL === '1')
        cfg.ssl = { rejectUnauthorized: false };
    return cfg;
}
// Synchronously initialize the pool for Prisma 7 adapter
const pgPool = new pg.Pool({ ...buildConfig(), max: parseInt(process.env.DB_POOL_MAX || '10') });
const adapter = new PrismaPg(pgPool);
export const prisma = new PrismaClient({ adapter });
async function getPool() {
    if (pool)
        return pool;
    pool = pgPool;
    // Initial connection check
    const client = await pool.connect();
    client.release();
    return pool;
}
async function query(sql, params = []) {
    const p = await getPool();
    const { rows } = await p.query(formatQuery(sql, params), params);
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
    const returning = /\bRETURNING\b/i.test(sql) ? sql : `${sql} RETURNING id`;
    const { rows } = await p.query(formatQuery(returning, params), params);
    return rows[0] ? rows[0].id : null;
}
/**
 * Transaction wrapper
 */
async function withTransaction(fn) {
    const p = await getPool();
    const pgClient = await p.connect();
    try {
        await pgClient.query('BEGIN');
        const txGet = async (sql, params = []) => {
            const { rows } = await pgClient.query(formatQuery(sql, params), params);
            return rows[0] || null;
        };
        const txAll = async (sql, params = []) => {
            const { rows } = await pgClient.query(formatQuery(sql, params), params);
            return rows;
        };
        const txRun = async (sql, params = []) => {
            await pgClient.query(formatQuery(sql, params), params);
        };
        const txInsert = async (sql, params = []) => {
            const returning = /\bRETURNING\b/i.test(sql) ? sql : `${sql} RETURNING id`;
            const { rows } = await pgClient.query(formatQuery(returning, params), params);
            return rows[0] ? rows[0].id : null;
        };
        const result = await fn({ get: txGet, all: txAll, run: txRun, insert: txInsert });
        await pgClient.query('COMMIT');
        return result;
    }
    catch (err) {
        await pgClient.query('ROLLBACK');
        throw err;
    }
    finally {
        pgClient.release();
    }
}
export { getPool, query, get, all, run, insert, withTransaction };
