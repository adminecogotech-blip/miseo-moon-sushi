module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    service: 'MISEO | Moon Sushi',
    status: 'scaffold-ready',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    note: 'This endpoint does not verify a database connection.'
  });
};
