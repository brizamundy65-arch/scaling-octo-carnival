/**
 * Migration Script v2: Add visibility, updated_at, deleted_at columns
 * Run with: DATABASE_URL=... node migrate-schema-v2.js
 */
const { Pool } = require('pg');

async function migrate() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    console.log('🚀 Starting migration v2...');

    try {
        // 1. Add visibility column to quotes (public, unlisted, private)
        console.log('  Adding visibility column...');
        await pool.query(`
            ALTER TABLE quotes 
            ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public' 
            CHECK (visibility IN ('public', 'unlisted', 'private'))
        `);

        // 2. Add updated_at column to quotes
        console.log('  Adding updated_at column...');
        await pool.query(`
            ALTER TABLE quotes 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        // 3. Add deleted_at column for soft delete
        console.log('  Adding deleted_at column...');
        await pool.query(`
            ALTER TABLE quotes 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL
        `);

        // 4. Add name column to users for display
        console.log('  Adding name column to users...');
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT NULL
        `);

        // 5. Create index for visibility filtering
        console.log('  Creating visibility index...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_quotes_visibility ON quotes(visibility)
        `);

        // 6. Create index for soft delete queries
        console.log('  Creating deleted_at index...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at)
        `);

        // 7. Create trigger to auto-update updated_at
        console.log('  Creating updated_at trigger...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_quotes_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS quotes_updated_at_trigger ON quotes;
            CREATE TRIGGER quotes_updated_at_trigger
            BEFORE UPDATE ON quotes
            FOR EACH ROW
            EXECUTE FUNCTION update_quotes_updated_at();
        `);

        // 8. Add quote_likes table for Milestone 4
        console.log('  Creating quote_likes table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quote_likes (
                id SERIAL PRIMARY KEY,
                quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(quote_id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_quote_likes_quote ON quote_likes(quote_id);
            CREATE INDEX IF NOT EXISTS idx_quote_likes_user ON quote_likes(user_id);
        `);

        // 9. Add quote_bookmarks table for Milestone 4
        console.log('  Creating quote_bookmarks table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quote_bookmarks (
                id SERIAL PRIMARY KEY,
                quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(quote_id, user_id)
            );
            CREATE INDEX IF NOT EXISTS idx_quote_bookmarks_quote ON quote_bookmarks(quote_id);
            CREATE INDEX IF NOT EXISTS idx_quote_bookmarks_user ON quote_bookmarks(user_id);
        `);

        console.log('✅ Migration v2 completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
