const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskflow',
  password: 'admin',
  port: 5432,
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dispatches (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        destination VARCHAR(255) NOT NULL,
        dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Base de datos inicializada correctamente.');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  }
}

initDb();

module.exports = {
  async getProducts() {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    return result.rows;
  },

  async addProduct({ name, stock, price }) {
    const result = await pool.query(
      'INSERT INTO products (name, stock, price) VALUES ($1, $2, $3) RETURNING *',
      [name, stock, price]
    );
    return result.rows[0];
  },

  async dispatchProduct({ productId, quantity, destination }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const checkStock = await client.query('SELECT stock FROM products WHERE id = $1', [productId]);
      if (checkStock.rows[0].stock < quantity) {
        throw new Error('Stock insuficiente para el despacho.');
      }

      await client.query(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, productId]
      );

      const dispatchResult = await client.query(
        'INSERT INTO dispatches (product_id, quantity, destination) VALUES ($1, $2, $3) RETURNING *',
        [productId, quantity, destination]
      );

      await client.query('COMMIT');
      return dispatchResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  },

  async deleteProduct(productId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM dispatches WHERE product_id = $1', [productId]);
      const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [productId]);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  },

  async getDispatches(filter = '') {
    let query = `
      SELECT d.id, p.name AS product_name, d.quantity, d.destination, d.dispatched_at 
      FROM dispatches d
      JOIN products p ON d.product_id = p.id
    `;
    let params = [];

    if (filter) {
      query += ` WHERE p.name ILIKE $1 OR d.destination ILIKE $1`;
      params.push(`%${filter}%`);
    }

    query += ` ORDER BY d.dispatched_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    return result.rows;
  },

  async cleanDispatches(period) {
    let intervalQuery = '';
    if (period === '1week') intervalQuery = '1 week';
    else if (period === '3months') intervalQuery = '3 months';
    else if (period === '6months') intervalQuery = '6 months';
    else throw new Error('Período no válido');

    const result = await pool.query(
      `DELETE FROM dispatches WHERE dispatched_at < NOW() - INTERVAL '${intervalQuery}' RETURNING *`
    );
    return result.rowCount;
  }
};