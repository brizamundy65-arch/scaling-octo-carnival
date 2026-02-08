const { getDb } = require('./db');
const setup = require('./setup');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  process.env.USE_REAL_DB = 'true';

  const db = await getDb();
  await setup.run(db, { seed: false });
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

