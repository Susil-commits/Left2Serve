import { getPool, query } from './database.js';
async function addColumnIfMissing(table, column, definition) {
    const row = await query(`SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`, [table, column]);
    if (Number(row[0].cnt) === 0) {
        await query(`ALTER TABLE "${table}" ADD COLUMN ${definition}`);
    }
}
async function initialize() {
    const pool = await getPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('donor','ngo','volunteer','admin')),
    phone VARCHAR(20),
    address TEXT,
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    token_version INT NOT NULL DEFAULT 0,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS food_listings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('event','restaurant','hotel','caterer','household')),
    quantity INT NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'servings',
    price NUMERIC(10,2) DEFAULT 0,
    expiry_date TIMESTAMP NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_instructions TEXT,
    image_urls JSONB DEFAULT '[]',
    dietary_preferences JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','reserved','collected','expired','cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    food_listing_id INT NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','collected','cancelled')),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'none',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    razorpay_order_id VARCHAR(255) NULL,
    razorpay_payment_id VARCHAR(255) NULL,
    razorpay_signature VARCHAR(255) NULL,
    pickup_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    actor_id INT,
    actor_role VARCHAR(20),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(30),
    target_id INT,
    detail TEXT,
    ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    listing_id INT NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (reservation_id, reviewer_id)
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    reservation_id INT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS watchlists (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(255),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_km NUMERIC(5, 2) NOT NULL DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    read_roles JSONB NOT NULL DEFAULT '["admin","donor","ngo","volunteer"]',
    write_roles JSONB NOT NULL DEFAULT '["admin","donor","ngo","volunteer"]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS forum_replies (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
    // Seed forum categories
    const catCount = await query('SELECT COUNT(*) AS cnt FROM forum_categories', []);
    if (Number(catCount[0].cnt) === 0) {
        const categories = [
            { name: 'General Discussion', desc: 'Discuss general topics related to food donation.', read: '["admin","donor","ngo","volunteer"]', write: '["admin","donor","ngo","volunteer"]' },
            { name: 'NGO & Volunteer Coordination', desc: 'Coordinate pickups and logistics.', read: '["admin","ngo","volunteer"]', write: '["admin","ngo","volunteer"]' },
            { name: 'Donor Announcements', desc: 'Announcements from our generous donors.', read: '["admin","donor","ngo","volunteer"]', write: '["admin","donor"]' },
            { name: 'Platform Announcements', desc: 'Official updates from the Left2Serve team.', read: '["admin","donor","ngo","volunteer"]', write: '["admin"]' },
        ];
        for (const c of categories) {
            await query('INSERT INTO forum_categories (name, description, read_roles, write_roles) VALUES ($1, $2, $3, $4)', [c.name, c.desc, c.read, c.write]);
        }
    }
    // migrations for older schemas
    await addColumnIfMissing('users', 'is_active', 'is_active BOOLEAN DEFAULT TRUE');
    await addColumnIfMissing('users', 'token_version', 'token_version INT NOT NULL DEFAULT 0');
    await addColumnIfMissing('users', 'failed_attempts', 'failed_attempts INT NOT NULL DEFAULT 0');
    await addColumnIfMissing('users', 'locked_until', 'locked_until TIMESTAMP NULL DEFAULT NULL');
    await addColumnIfMissing('users', 'reset_token', 'reset_token VARCHAR(255) NULL');
    await addColumnIfMissing('users', 'reset_expires', 'reset_expires TIMESTAMP NULL');
    await addColumnIfMissing('users', 'two_factor_secret', 'two_factor_secret VARCHAR(255) NULL');
    await addColumnIfMissing('users', 'two_factor_enabled', 'two_factor_enabled BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing('reservations', 'payment_method', "payment_method VARCHAR(20) NOT NULL DEFAULT 'none'");
    await addColumnIfMissing('reservations', 'payment_status', "payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
    await addColumnIfMissing('reservations', 'amount', 'amount NUMERIC(10,2) NOT NULL DEFAULT 0');
    await addColumnIfMissing('reservations', 'razorpay_order_id', 'razorpay_order_id VARCHAR(255) NULL');
    await addColumnIfMissing('reservations', 'razorpay_payment_id', 'razorpay_payment_id VARCHAR(255) NULL');
    await addColumnIfMissing('reservations', 'razorpay_signature', 'razorpay_signature VARCHAR(255) NULL');
    await addColumnIfMissing('food_listings', 'latitude', 'latitude NUMERIC(10, 7) NULL');
    await addColumnIfMissing('food_listings', 'longitude', 'longitude NUMERIC(10, 7) NULL');
    await addColumnIfMissing('food_listings', 'dietary_preferences', "dietary_preferences JSONB DEFAULT '[]'");
    await addColumnIfMissing('users', 'avatar_url', 'avatar_url VARCHAR(255) NULL');
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_food_listings_status ON food_listings(status)',
        'CREATE INDEX IF NOT EXISTS idx_food_listings_user ON food_listings(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_food_listings_expiry ON food_listings(expiry_date)',
        'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_reservations_listing ON reservations(food_listing_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at)',
        'CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_listing ON reviews(listing_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_reservation ON messages(reservation_id)',
        'CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category_id)',
        'CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id)',
        "CREATE INDEX IF NOT EXISTS idx_food_listings_search ON food_listings USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || category))",
    ];
    for (const sql of indexes) {
        try {
            await pool.query(sql);
        }
        catch { /* ignore duplicate-index errors */ }
    }
    console.log('PostgreSQL database initialized successfully');
}
export default initialize;
