const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { z } = require('zod');
const { validate } = require('../middleware/validate');

// Middleware to verify admin role
const adminMiddleware = async (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        next();
    });
};

router.use(adminMiddleware);

const intIdParamSchema = z.object({
    body: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const uuidIdParamSchema = z.object({
    body: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().uuid() }),
});

const adminUserPatchSchema = z.object({
    body: z.object({
        role: z.string().trim().min(1).max(50).optional(),
        is_verified: z.boolean().optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().uuid() }),
});

const adminQuoteUpsertSchema = z.object({
    body: z.object({
        text: z.string().trim().min(1).max(1000).optional(),
        author: z.string().trim().min(1).max(100).optional(),
        subcategory_id: z.number().int().positive().optional(),
        background_color: z.string().trim().max(50).optional(),
        text_color: z.string().trim().max(50).optional(),
        font_family: z.string().trim().max(50).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

const adminCategoryUpsertSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(50),
        description: z.string().trim().max(500).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

const adminQuoteUpdateSchema = z.object({
    body: adminQuoteUpsertSchema.shape.body,
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const adminCategoryUpdateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(50).optional(),
        description: z.string().trim().max(500).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const adminSubcategoryCreateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(50),
        category_id: z.number().int().positive(),
        tags: z.array(z.string().trim().min(1).max(50)).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

const widgetKeySchema = z.object({
    body: z.object({
        title: z.string().trim().min(1).max(100).optional(),
        content: z.any().optional(),
        is_active: z.boolean().optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({ key: z.string().trim().min(1).max(50) }),
});

const settingsSchema = z.object({
    body: z.object({
        smtp_host: z.string().trim().optional(),
        smtp_port: z.string().trim().optional(),
        smtp_user: z.string().trim().optional(),
        smtp_pass: z.string().trim().optional(),
        smtp_from: z.string().trim().optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

// GET /api/admin/stats - Aggregate counts
router.get('/stats', async (req, res) => {
    try {
        const db = await getDb();
        
        const usersCount = await db.query('SELECT COUNT(*) FROM users');
        const quotesCount = await db.query('SELECT COUNT(*) FROM quotes');
        const interactionCount = await db.query('SELECT COUNT(*) FROM user_interactions');
        
        // Stats by interaction type
        const interactionStats = await db.query(`
            SELECT interaction_type, COUNT(*) as count 
            FROM user_interactions 
            GROUP BY interaction_type
        `);

        res.json({
            users: parseInt(usersCount.rows[0].count),
            quotes: parseInt(quotesCount.rows[0].count),
            interactions: parseInt(interactionCount.rows[0].count),
            interactionBreakdown: interactionStats.rows
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/users - List users
router.get('/users', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query('SELECT id, email, role, is_verified, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Admin users list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/admin/users/:id - Update user role/status
router.patch('/users/:id', validate(adminUserPatchSchema), async (req, res) => {
    const { id } = req.validated.params;
    const { role, is_verified } = req.validated.body;
    
    try {
        const db = await getDb();
        const result = await db.query(
            'UPDATE users SET role = COALESCE($1, role), is_verified = COALESCE($2, is_verified) WHERE id = $3 RETURNING id, email, role, is_verified',
            [role, is_verified, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Admin user update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/quotes - List quotes with advanced info
router.get('/quotes', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            ORDER BY q.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Admin quotes list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/quotes - Create quote
router.post('/quotes', validate(adminQuoteUpsertSchema), async (req, res) => {
    const { text, author, subcategory_id, background_color, text_color, font_family } = req.validated.body;
    if (!text || !subcategory_id) {
        return res.status(400).json({ error: 'text and subcategory_id are required' });
    }
    try {
        const db = await getDb();
        const result = await db.query(
            `INSERT INTO quotes (text, author, subcategory_id, background_color, text_color, font_family) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [text, author, subcategory_id, background_color, text_color, font_family]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Admin quote create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/quotes/:id - Update quote
router.put('/quotes/:id', validate(adminQuoteUpdateSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    const { text, author, subcategory_id, background_color, text_color, font_family } = req.validated.body;
    try {
        const db = await getDb();
        const result = await db.query(
            `UPDATE quotes SET 
                text = COALESCE($1, text), 
                author = COALESCE($2, author), 
                subcategory_id = COALESCE($3, subcategory_id),
                background_color = COALESCE($4, background_color),
                text_color = COALESCE($5, text_color),
                font_family = COALESCE($6, font_family)
             WHERE id = $7 RETURNING *`,
            [text, author, subcategory_id, background_color, text_color, font_family, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Quote not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Admin quote update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/quotes/:id - Delete quote
router.delete('/quotes/:id', validate(intIdParamSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    try {
        const db = await getDb();
        const result = await db.query('DELETE FROM quotes WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) {
        console.error('Admin quote delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/categories - List categories with subcategory counts
router.get('/categories', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(`
            SELECT c.*, COUNT(s.id) as subcategory_count
            FROM categories c
            LEFT JOIN subcategories s ON c.id = s.category_id
            GROUP BY c.id
            ORDER BY c.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Admin categories list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/categories - Create category
router.post('/categories', validate(adminCategoryUpsertSchema), async (req, res) => {
    const { name, description } = req.validated.body;
    try {
        const db = await getDb();
        const result = await db.query(
            'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
            [name, description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Admin category create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/categories/:id - Update category
router.put('/categories/:id', validate(adminCategoryUpdateSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    const { name, description } = req.validated.body;
    try {
        const db = await getDb();
        const result = await db.query(
            'UPDATE categories SET name = COALESCE($1, name), description = COALESCE($2, description) WHERE id = $3 RETURNING *',
            [name, description, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Admin category update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/subcategories/:id - Get subcategories for a category
router.get('/categories/:id/subcategories', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await getDb();
        const result = await db.query('SELECT * FROM subcategories WHERE category_id = $1 ORDER BY name ASC', [id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Admin subcategories list error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/admin/subcategories - Create subcategory
router.post('/subcategories', validate(adminSubcategoryCreateSchema), async (req, res) => {
    const { name, category_id, tags } = req.validated.body;
    try {
        const db = await getDb();
        const result = await db.query(
            'INSERT INTO subcategories (name, category_id, tags) VALUES ($1, $2, $3) RETURNING *',
            [name, category_id, tags || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Admin subcategory create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/subcategories/:id - Delete subcategory
router.delete('/subcategories/:id', validate(intIdParamSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    try {
        const db = await getDb();
        const result = await db.query('DELETE FROM subcategories WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Subcategory not found' });
        res.json({ message: 'Subcategory deleted successfully' });
    } catch (err) {
        console.error('Admin subcategory delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/categories/:id', validate(intIdParamSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    try {
        const db = await getDb();
        // Check if has dependencies
        const quotesRef = await db.query('SELECT COUNT(*) FROM quotes q JOIN subcategories s ON q.subcategory_id = s.id WHERE s.category_id = $1', [id]);
        if (parseInt(quotesRef.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete category with existing quotes.' });
        }
        
        await db.query('DELETE FROM subcategories WHERE category_id = $1', [id]);
        const result = await db.query('DELETE FROM categories WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Admin category delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/interactions/:id - Delete any interaction (for moderation)
router.delete('/interactions/:id', validate(intIdParamSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    try {
        const db = await getDb();
        const result = await db.query('DELETE FROM user_interactions WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Interaction not found' });
        }
        res.json({ message: 'Interaction deleted successfully' });
    } catch (err) {
        console.error('Admin interaction delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Widget Management ---

// Get all widgets
router.get('/widgets', adminMiddleware, async (req, res) => {
    const pool = await getDb();
    try {
        const result = await pool.query('SELECT * FROM site_widgets ORDER BY key ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching widgets:', error);
        res.status(500).json({ error: 'Failed to fetch widgets' });
    }
});

// Update a widget
router.put('/widgets/:key', adminMiddleware, validate(widgetKeySchema), async (req, res) => {
    const { key } = req.validated.params;
    const { title, content, is_active } = req.validated.body;
    const pool = await getDb();
    try {
        await pool.query(
            `UPDATE site_widgets 
             SET title = COALESCE($1, title), 
                 content = COALESCE($2, content), 
                 is_active = COALESCE($3, is_active),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE key = $4`,
            [title, typeof content === 'object' ? JSON.stringify(content) : content, is_active, key]
        );
        res.json({ message: 'Widget updated successfully' });
    } catch (error) {
        console.error('Error updating widget:', error);
        res.status(500).json({ error: 'Failed to update widget' });
    }
});

// --- System Settings (SMTP) ---

// GET /api/admin/settings - Get all system settings
router.get('/settings', adminMiddleware, async (req, res) => {
    const pool = await getDb();
    try {
        const result = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from')");
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/admin/settings - Update system settings
router.post('/settings', adminMiddleware, validate(settingsSchema), async (req, res) => {
    const pool = await getDb();
    const settings = req.validated.body;

    try {
        await pool.query('BEGIN');

        for (const [key, value] of Object.entries(settings)) {
            if (value !== undefined) {
                // Upsert settings
                await pool.query(
                    `INSERT INTO system_settings (key, value)
                     VALUES ($1, $2)
                     ON CONFLICT (key)
                     DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
                    [key, value]
                );
            }
        }

        await pool.query('COMMIT');
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
