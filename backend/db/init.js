import { getPool } from './database.js';

async function initialize() {
  const pool = await getPool();
  await pool.execute(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('donor','ngo','volunteer','admin') NOT NULL, phone VARCHAR(20), address TEXT, organization VARCHAR(255), created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS food_listings (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, category ENUM('event','restaurant','hotel','caterer','household') NOT NULL, quantity INT NOT NULL, unit VARCHAR(50) NOT NULL DEFAULT 'servings', price DECIMAL(10,2) DEFAULT 0, expiry_date DATETIME NOT NULL, pickup_address TEXT NOT NULL, pickup_instructions TEXT, image_urls JSON DEFAULT ('[]'), status ENUM('available','reserved','collected','expired','cancelled') DEFAULT 'available', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.execute(`CREATE TABLE IF NOT EXISTS reservations (id INT AUTO_INCREMENT PRIMARY KEY, food_listing_id INT NOT NULL, user_id INT NOT NULL, quantity INT NOT NULL, status ENUM('pending','approved','collected','cancelled') DEFAULT 'pending', pickup_time DATETIME, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (food_listing_id) REFERENCES food_listings(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try { await pool.execute('CREATE INDEX idx_food_listings_status ON food_listings(status)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_food_listings_user ON food_listings(user_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reservations_user ON reservations(user_id)'); } catch {}
  try { await pool.execute('CREATE INDEX idx_reservations_listing ON reservations(food_listing_id)'); } catch {}
  console.log('MySQL database initialized successfully');
}

export default initialize;