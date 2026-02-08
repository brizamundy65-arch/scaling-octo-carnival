const { newDb } = require('pg-mem');
const { Pool } = require('pg');
require('dotenv').config();

let pool;
const state = {
    isInMemory: false
};

async function getDb() {
    if (pool) return pool;

    const useRealDb =
        process.env.USE_REAL_DB === 'true' ||
        (process.env.NODE_ENV === 'production' && !!process.env.DATABASE_URL);

    if (useRealDb) {
        console.log('Connecting to real PostgreSQL database...');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    } else {
        console.log('Initializing in-memory database (pg-mem)...');
        state.isInMemory = true;
        const db = newDb();

        // Register RANDOM() function for pg-mem
        db.public.registerFunction({
            name: 'random',
            args: [],
            returns: db.public.getType('float'),
            implementation: () => Math.random(),
            impure: true // Indicates it returns different values for same calls
        });

        const { Pool: MemPool } = db.adapters.createPg();
        pool = new MemPool();

        // Attach underlying db for special access if needed
        pool._db = db;
    }
    return pool;
}

module.exports = { getDb, state };
