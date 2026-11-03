const { Client } = require('pg');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ service: 'MISEO | Moon Sushi', database: 'not_configured' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT current_database() AS database, now() AS checked_at');
    return res.status(200).json({ service: 'MISEO | Moon Sushi', database: 'connected', databaseName: result.rows[0].database, checkedAt: result.rows[0].checked_at });
  } catch (error) {
    console.error('MISEO database connectivity check failed:', error.message);
    return res.status(503).json({ service: 'MISEO | Moon Sushi', database: 'unavailable', message: 'Connection check failed. Inspect server logs; no credentials are returned.' });
  } finally {
    await client.end().catch(() => {});
  }
};
