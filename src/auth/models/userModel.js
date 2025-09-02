


const pool = require('../../../config/database');

const createUserTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name VARCHAR(255) NOT NULL,
      contact_number VARCHAR(20) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) CHECK (role IN ('buyer', 'supplier', 'admin')) DEFAULT 'buyer',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP NULL
    );

    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_token ON blacklisted_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_blacklisted_tokens_user_id ON blacklisted_tokens(user_id);
  `;

    await pool.query(query);
};

const User = {
    async create(userData) {
        const { id, full_name, contact_number, email, passwordHash, role } = userData;
        const query = `
      INSERT INTO users (id, full_name, contact_number, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, full_name, contact_number, email, role, created_at
    `;
        const values = [id, full_name, contact_number, email, passwordHash, role];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    },

    async findById(id) {
        const query = 'SELECT id, full_name, contact_number, email, role, created_at FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            fields.push(`${key} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
        });

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async deactivate(userId) {
        const query = `
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING id, email, is_active
    `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    async delete(userId) {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING id, email';
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    },

    async blacklistToken(token, userId, expires_at) {
        const query = `
      INSERT INTO blacklisted_tokens (token, user_id, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (token) DO NOTHING
    `;
        await pool.query(query, [token, userId, expires_at]);
    },

    async isTokenBlacklisted(token) {
        const query = 'SELECT 1 FROM blacklisted_tokens WHERE token = $1 AND expires_at > NOW()';
        const result = await pool.query(query, [token]);
        return result.rows.length > 0;
    },

    async cleanupExpiredTokens() {
        const query = 'DELETE FROM blacklisted_tokens WHERE expires_at <= NOW()';
        await pool.query(query);
    }
};

createUserTable().then(async () => {
    console.log('User tables initialized');
    setInterval(() => {
        User.cleanupExpiredTokens().catch(console.error);
    }, 3600000);
}).catch(console.error);

module.exports = User;