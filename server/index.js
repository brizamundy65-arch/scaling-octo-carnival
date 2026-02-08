const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { getDb, state } = require('./db');
const quotesRoutes = require('./routes/quotes');
const interactionsRoutes = require('./routes/interactions');
const categoriesRoutes = require('./routes/categories');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

const allowedOrigins = new Set(
    String(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
);

app.use(
    cors({
        origin: (origin, cb) => {
            // Allow same-origin / server-to-server requests
            if (!origin) return cb(null, true);
            // If not configured, default-allow (dev-friendly)
            if (allowedOrigins.size === 0) return cb(null, true);
            return cb(null, allowedOrigins.has(origin));
        },
        credentials: true,
    })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// SEO + public HTML routes
app.use('/', publicRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check under /api for easier proxying
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/quotes', quotesRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/widgets', async (req, res) => {
    const { getDb } = require('./db');
    const pool = await getDb();
    try {
        const result = await pool.query('SELECT key, title, content FROM site_widgets WHERE is_active = true');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching public widgets:', error);
        res.status(500).json({ error: 'Failed to fetch widgets' });
    }
});

async function startServer() {
    try {
        const db = await getDb();
        console.log('Database initialized.');

        // Run inline migrations for new columns/tables
        try {
            console.log('Running schema migrations...');
            await db.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public'`);
            await db.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            await db.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT NULL`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quotes_visibility ON quotes(visibility)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at)`);
            
            // Likes and bookmarks tables
            await db.query(`
                CREATE TABLE IF NOT EXISTS quote_likes (
                    id SERIAL PRIMARY KEY,
                    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(quote_id, user_id)
                )
            `);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quote_likes_quote ON quote_likes(quote_id)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quote_likes_user ON quote_likes(user_id)`);
            
            await db.query(`
                CREATE TABLE IF NOT EXISTS quote_bookmarks (
                    id SERIAL PRIMARY KEY,
                    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(quote_id, user_id)
                )
            `);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quote_bookmarks_quote ON quote_bookmarks(quote_id)`);
            await db.query(`CREATE INDEX IF NOT EXISTS idx_quote_bookmarks_user ON quote_bookmarks(user_id)`);
            
            // Share branding widget
            await db.query(`
                INSERT INTO site_widgets (key, title, content, is_active)
                VALUES ('share_branding', 'Share Image Branding', '{"brand_text": "WeTalkTo", "badge_bg_color": "#1a1a1a", "badge_text_color": "#ffffff", "padding_color": "#1a1a1a"}', true)
                ON CONFLICT (key) DO NOTHING
            `);
            
            // Settings table migration
            await db.query(`
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(50) PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('Schema migrations completed.');
        } catch (migrationErr) {
            console.error('Migration error (non-fatal):', migrationErr.message);
        }

        const shouldAutoMigrate =
            process.env.AUTO_MIGRATE === 'true' ||
            process.env.AUTO_MIGRATE === '1' ||
            state.isInMemory;

        if (shouldAutoMigrate) {
            const setup = require('./setup');
            if (state.isInMemory) {
                console.log('Running in-memory setup...');
                await setup.run(db);
            } else {
                console.log('AUTO_MIGRATE enabled; applying schema (seed=false)...');
                await setup.run(db, { seed: false });
            }
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
