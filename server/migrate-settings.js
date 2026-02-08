const { getDb } = require('./db');

async function migrate() {
  const db = await getDb();
  console.log('Migrating system settings...');

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('system_settings table checked/created.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
