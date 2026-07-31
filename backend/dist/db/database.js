import pg, { Pool } from 'pg';
// PostgreSQL returns BIGINT (COUNT(*)) and NUMERIC (SUM) as strings by default.
// Parse them as Numbers — safe for the scale of this app.
pg.types.setTypeParser(20, (v) => (v == null ? null : Number(v))); // int8 / bigint
pg.types.setTypeParser(1700, (v) => (v == null ? null : Number(v))); // numeric / decimal
let pool = null;
// Convert MySQL-style "?" placeholders into PostgreSQL "$N" placeholders so the
// route files can keep using the familiar "?" syntax without per-query renumbering.
// The parser correctly handles '' (escaped single quotes) inside SQL strings.
// NOTE: PostgreSQL JSON operators ?| and ?& are NOT supported — use $N params directly for those.
function formatQuery(sql, params) {
    if (!Array.isArray(params) || params.length === 0)
        return sql;
    // Safety: PostgreSQL JSON operators ?| and ?& use literal `?` and will be
    // mis-parsed as parameter placeholders. Callers that need those operators
    // must use $1-style params and NOT pass them through this function.
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
            // Check for escaped quote '' (two consecutive quotes outside a string = start of empty string literal)
            inString = true;
            result += char;
            j++;
            continue;
        }
        if (char === "'" && inString) {
            // Check if next char is also ' (escaped quote inside string)
            if (sql[j + 1] === "'") {
                result += "''"; // emit both, stay in string
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
async function getPool() {
    if (pool)
        return pool;
    const cfg = buildConfig();
    pool = new Pool({ ...cfg, max: 10 });
    // verify connectivity early with a clear error
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
export { getPool, query, get, all, run, insert };
