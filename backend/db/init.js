import { getPool } from './database.js';

async function addColumnIfMissing(table, column, definition) {
  const pool = await getPool();
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (rows[0].cnt === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

async function initialize() {
  const pool = await getPool();
  await pool.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('donor','ngo','volunteer','admin') NOT NULL, phone VARCHAR(20), address TEXT, organization VARCHAR(255), is_active BOOLEAN DEFAULT TRUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS food_listings (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, category ENUM('event','restaurant','hotel','caterer','household') NOT NULL, quantity INT NOT NULL, unit VARCHAR(50) NOT NULL DEFAULT 'servings', price DECIMAL(10,2) DEFAULT 0, expiry_date DATETIME NOT NULL, pickup_address TEXT NOT NULL, pickup_instructions TEXT, image_urls JSON DEFAULT ('[]'), status ENUM('available','reserved','collected','expired','cancelled') DEFAULT 'available', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS reservations (id INT AUTO_INCREMENT PRIMARY KEY, food_listing_id INT NOT NULL, user_id INT NOT NULL, quantity INT NOT NULL, status ENUM('pending','approved','collected','cancelled') DEFAULT 'pending', payment_method VARCHAR(20) NOT NULL DEFAULT 'none', payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', amount DECIMAL(10,2) NOT NULL DEFAULT 0, razorpay_order_id VARCHAR(255) NULL, razorpay_payment_id VARCHAR(255) NULL, razorpay_signature VARCHAR(255) NULL, pickup_time DATETIME, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (food_listing_id) REFERENCES food_listings(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, data JSON DEFAULT ('{}'), is_read BOOLEAN DEFAULT FALSE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS audit_log (id INT AUTO_INCREMENT PRIMARY KEY, actor_id INT, actor_role VARCHAR(20), action VARCHAR(50) NOT NULL, target_type VARCHAR(30), target_id INT, detail TEXT, ip VARCHAR(45), created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS reviews (id INT AUTO_INCREMENT PRIMARY KEY, reservation_id INT NOT NULL, listing_id INT NOT NULL, reviewer_id INT NOT NULL, reviewee_id INT NOT NULL, rating TINYINT NOT NULL, comment VARCHAR(500), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_review (reservation_id, reviewer_id), FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE, FOREIGN KEY (listing_id) REFERENCES food_listings(id) ON DELETE CASCADE, FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await addColumnIfMissing('users', 'is_active', 'is_active BOOLEAN DEFAULT TRUE AFTER organization');
  await addColumnIfMissing('users', 'token_version', 'token_version INT NOT NULL DEFAULT 0 AFTER is_active');
  await addColumnIfMissing('users', 'failed_attempts', 'failed_attempts INT NOT NULL DEFAULT 0 AFTER token_version');
  await addColumnIfMissing('users', 'locked_until', 'locked_until DATETIME NULL DEFAULT NULL AFTER failed_attempts');
  await addColumnIfMissing('reservations', 'payment_method', "payment_method VARCHAR(20) NOT NULL DEFAULT 'none' AFTER status");
  await addColumnIfMissing('reservations', 'payment_status', "payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER payment_method");
  await addColumnIfMissing('reservations', 'amount', 'amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER payment_status');
  await addColumnIfMissing('reservations', 'razorpay_order_id', 'razorpay_order_id VARCHAR(255) NULL AFTER amount');
  await addColumnIfMissing('reservations', 'razorpay_payment_id', 'razorpay_payment_id VARCHAR(255) NULL AFTER razorpay_order_id');
  await addColumnIfMissing('reservations', 'razorpay_signature', 'razorpay_signature VARCHAR(255) NULL AFTER razorpay_payment_id');
  try { await pool.execute('CREATE INDEX idx_food_listings_status ON food_listings(status)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_food_listings_user ON food_listings(user_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_food_listings_expiry ON food_listings(expiry_date)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reservations_user ON reservations(user_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reservations_listing ON reservations(food_listing_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_audit_log_created ON audit_log(created_at)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reviews_listing ON reviews(listing_id)'); } catch {}
  console.log('MySQL database initialized successfully');
}

export default initialize;
