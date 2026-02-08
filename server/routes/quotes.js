const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const router = express.Router();
const { getDb } = require('../db');
const { validate } = require('../middleware/validate');
const { ensureGuestId, getActorId } = require('../middleware/actor');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

const idParamSchema = z.object({
    body: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const createQuoteSchema = z.object({
    body: z.object({
        text: z.string().trim().min(1).max(1000),
        author: z.string().trim().min(1).max(100).optional(),
        subcategory_id: z.number().int().positive(),
        background_color: z.string().trim().max(50).optional(),
        text_color: z.string().trim().max(50).optional(),
        font_family: z.string().trim().max(50).optional(),
        visibility: z.enum(['public', 'unlisted', 'private']).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

const updateQuoteSchema = z.object({
    body: z.object({
        text: z.string().trim().min(1).max(1000).optional(),
        author: z.string().trim().min(1).max(100).optional(),
        subcategory_id: z.number().int().positive().optional(),
        background_color: z.string().trim().max(50).optional(),
        text_color: z.string().trim().max(50).optional(),
        font_family: z.string().trim().max(50).optional(),
        visibility: z.enum(['public', 'unlisted', 'private']).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const createCommentSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(1000),
    }),
    query: z.object({}).passthrough(),
    params: z.object({ id: z.string().regex(/^\d+$/) }),
});

const updateCommentSchema = z.object({
    body: z.object({
        content: z.string().trim().min(1).max(1000),
    }),
    query: z.object({}).passthrough(),
    params: z.object({
        id: z.string().regex(/^\d+$/),
        commentId: z.string().regex(/^\d+$/),
    }),
});

const commentIdParamSchema = z.object({
    body: z.object({}).passthrough(),
    query: z.object({}).passthrough(),
    params: z.object({
        id: z.string().regex(/^\d+$/),
        commentId: z.string().regex(/^\d+$/),
    }),
});

// Helper to calculate category weights
async function getUserCategoryWeights(db, userId) {
    if (!userId) return {};

    // Get recent interactions (e.g., last 100)
    // Weight: Like=3, Remix=5, View=1, Share=4
    const result = await db.query(`
        SELECT
            c.id as category_id,
            ui.interaction_type
        FROM user_interactions ui
        JOIN quotes q ON ui.quote_id = q.id
        JOIN subcategories s ON q.subcategory_id = s.id
        JOIN categories c ON s.category_id = c.id
        WHERE ui.user_id = $1
        ORDER BY ui.created_at DESC
        LIMIT 100
    `, [userId]);

    const weights = {};
    const points = { view: 1, like: 3, share: 4, remix: 5 };

    for (const row of result.rows) {
        const catId = row.category_id;
        const score = points[row.interaction_type] || 1;
        weights[catId] = (weights[catId] || 0) + score;
    }
    return weights;
}

// GET /api/timeline
router.get('/timeline', ensureGuestId, optionalAuthMiddleware, async (req, res) => {
    try {
        const userId = getActorId(req);
        const db = await getDb();

        let preferredCategoryIds = [];

        if (userId) {
            const weights = await getUserCategoryWeights(db, userId);
            // Sort categories by weight descending
            preferredCategoryIds = Object.entries(weights)
                .sort(([, a], [, b]) => b - a)
                .map(([id]) => parseInt(id));
        }

        let quotes = [];

        if (preferredCategoryIds.length > 0) {
            // Get from preferred
            // pg-mem might be strict about array parameter types.
            // Let's manually expand the IDs or use IN clause with dynamic parameters
            // to avoid "cannot cast text to integer" if $1 is passed as string array?
            // Actually, ANY($1) expects an array.

            // Safer way for ANY($1): Ensure it's passed as an integer array

            // Debugging showed "cannot cast text to integer". This likely happens comparing c.id (int) to ANY($1).
            // If the driver sends $1 as string array, pg-mem might fail.
            // Let's construct the IN clause manually for safety in this environment.

            const ids = preferredCategoryIds.join(',');

            const preferredRes = await db.query(`
                SELECT q.*, s.name as subcategory_name, c.name as category_name
                FROM quotes q
                JOIN subcategories s ON q.subcategory_id = s.id
                JOIN categories c ON s.category_id = c.id
                WHERE c.id IN (${ids}) AND q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public'
                ORDER BY RANDOM()
                LIMIT 14
            `);

            // Get from others (discovery)
            const otherRes = await db.query(`
                SELECT q.*, s.name as subcategory_name, c.name as category_name
                FROM quotes q
                JOIN subcategories s ON q.subcategory_id = s.id
                JOIN categories c ON s.category_id = c.id
                WHERE c.id NOT IN (${ids}) AND q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public'
                ORDER BY RANDOM()
                LIMIT 6
            `);

            quotes = [...preferredRes.rows, ...otherRes.rows];

            // Shuffle the combined result
            quotes.sort(() => Math.random() - 0.5);

        } else {
            // No history, purely random
            const resAll = await db.query(`
                SELECT q.*, s.name as subcategory_name, c.name as category_name
                FROM quotes q
                JOIN subcategories s ON q.subcategory_id = s.id
                JOIN categories c ON s.category_id = c.id
                WHERE q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public'
                ORDER BY RANDOM()
                LIMIT 20
            `);
            quotes = resAll.rows;
        }

        res.json(quotes);

    } catch (err) {
        console.error('Error fetching timeline:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/discovery
// Returns a grid-friendly diverse set
router.get('/discovery', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public'
            ORDER BY RANDOM()
            LIMIT 30
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching discovery:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/latest
// Returns latest quotes for "Latest" feed
router.get('/latest', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public'
            ORDER BY q.created_at DESC
            LIMIT 30
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching latest quotes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/search?q=...
router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) return res.json([]);

        const db = await getDb();
        const term = `%${q}%`;

        const result = await db.query(
            `
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.deleted_at IS NULL AND COALESCE(q.visibility, 'public') = 'public' AND (
                q.text ILIKE $1 OR
                q.author ILIKE $1 OR
                s.name ILIKE $1 OR
                c.name ILIKE $1 OR
                array_to_string(s.tags, ' ') ILIKE $1
            )
            ORDER BY q.created_at DESC
            LIMIT 50
        `,
            [term]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error searching quotes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/user/:userId - Get quotes by a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const db = await getDb();
        
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.user_id = $1 AND q.deleted_at IS NULL AND q.visibility = 'public'
            ORDER BY q.created_at DESC
            LIMIT 50
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching user quotes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/my - Get current user's quotes (including private/unlisted)
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const db = await getDb();
        
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.user_id = $1 AND q.deleted_at IS NULL
            ORDER BY q.created_at DESC
            LIMIT 100
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching my quotes:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/quotes/:id/like - Like a quote
router.post('/:id/like', writeLimiter, authMiddleware, validate(idParamSchema), async (req, res) => {
    const quoteId = parseInt(req.validated.params.id, 10);
    const userId = req.user.id;
    
    try {
        const db = await getDb();
        
        // Check quote exists
        const exists = await db.query('SELECT id FROM quotes WHERE id = $1 AND deleted_at IS NULL', [quoteId]);
        if (exists.rowCount === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        
        // Insert like (ignore if already exists)
        await db.query(`
            INSERT INTO quote_likes (quote_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (quote_id, user_id) DO NOTHING
        `, [quoteId, userId]);
        
        // Get updated like count
        const countResult = await db.query('SELECT COUNT(*) as count FROM quote_likes WHERE quote_id = $1', [quoteId]);
        
        res.json({ liked: true, count: parseInt(countResult.rows[0].count, 10) });
    } catch (err) {
        console.error('Error liking quote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/quotes/:id/like - Unlike a quote
router.delete('/:id/like', writeLimiter, authMiddleware, validate(idParamSchema), async (req, res) => {
    const quoteId = parseInt(req.validated.params.id, 10);
    const userId = req.user.id;
    
    try {
        const db = await getDb();
        
        await db.query('DELETE FROM quote_likes WHERE quote_id = $1 AND user_id = $2', [quoteId, userId]);
        
        // Get updated like count
        const countResult = await db.query('SELECT COUNT(*) as count FROM quote_likes WHERE quote_id = $1', [quoteId]);
        
        res.json({ liked: false, count: parseInt(countResult.rows[0].count, 10) });
    } catch (err) {
        console.error('Error unliking quote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/:id/like - Check if user liked a quote
router.get('/:id/like', optionalAuthMiddleware, validate(idParamSchema), async (req, res) => {
    const quoteId = parseInt(req.validated.params.id, 10);
    const userId = req.user?.id;
    
    try {
        const db = await getDb();
        
        // Get like count
        const countResult = await db.query('SELECT COUNT(*) as count FROM quote_likes WHERE quote_id = $1', [quoteId]);
        const count = parseInt(countResult.rows[0].count, 10);
        
        // Check if user liked
        let liked = false;
        if (userId) {
            const likeResult = await db.query('SELECT 1 FROM quote_likes WHERE quote_id = $1 AND user_id = $2', [quoteId, userId]);
            liked = likeResult.rowCount > 0;
        }
        
        res.json({ liked, count });
    } catch (err) {
        console.error('Error checking like:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/quotes/:id/bookmark - Bookmark a quote
router.post('/:id/bookmark', writeLimiter, authMiddleware, validate(idParamSchema), async (req, res) => {
    const quoteId = parseInt(req.validated.params.id, 10);
    const userId = req.user.id;
    
    try {
        const db = await getDb();
        
        await db.query(`
            INSERT INTO quote_bookmarks (quote_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (quote_id, user_id) DO NOTHING
        `, [quoteId, userId]);
        
        res.json({ bookmarked: true });
    } catch (err) {
        console.error('Error bookmarking quote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/quotes/:id/bookmark - Remove bookmark
router.delete('/:id/bookmark', writeLimiter, authMiddleware, validate(idParamSchema), async (req, res) => {
    const quoteId = parseInt(req.validated.params.id, 10);
    const userId = req.user.id;
    
    try {
        const db = await getDb();
        await db.query('DELETE FROM quote_bookmarks WHERE quote_id = $1 AND user_id = $2', [quoteId, userId]);
        res.json({ bookmarked: false });
    } catch (err) {
        console.error('Error removing bookmark:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/bookmarks - Get user's bookmarked quotes
router.get('/bookmarks', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    
    try {
        const db = await getDb();
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN quote_bookmarks qb ON q.id = qb.quote_id
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE qb.user_id = $1 AND q.deleted_at IS NULL
            ORDER BY qb.created_at DESC
            LIMIT 100
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching bookmarks:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/quotes/:id/comments - List comments for a quote
router.get('/:id/comments', validate(idParamSchema), async (req, res) => {
    try {
        const quoteId = parseInt(req.validated.params.id, 10);
        const db = await getDb();

        const result = await db.query(
            `
            SELECT
                qc.id,
                qc.quote_id,
                qc.user_id,
                qc.content,
                qc.created_at,
                qc.updated_at,
                u.email as user_email
            FROM quote_comments qc
            LEFT JOIN users u ON qc.user_id = u.id
            WHERE qc.quote_id = $1
            ORDER BY qc.created_at ASC
            LIMIT 200
        `,
            [quoteId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/quotes/:id/comments - Add a comment (auth required)
router.post(
    '/:id/comments',
    writeLimiter,
    authMiddleware,
    validate(createCommentSchema),
    async (req, res) => {
        const quoteId = parseInt(req.validated.params.id, 10);
        const { content } = req.validated.body;
        const userId = req.user.id;

        try {
            const db = await getDb();

            const exists = await db.query('SELECT id FROM quotes WHERE id = $1', [quoteId]);
            if (exists.rowCount === 0) {
                return res.status(404).json({ error: 'Quote not found' });
            }

            const inserted = await db.query(
                `
                INSERT INTO quote_comments (quote_id, user_id, content)
                VALUES ($1, $2, $3)
                RETURNING id, quote_id, user_id, content, created_at, updated_at
            `,
                [quoteId, userId, content]
            );

            const comment = inserted.rows[0];
            res.status(201).json({
                ...comment,
                user_email: req.user.email || null,
            });
        } catch (err) {
            console.error('Error creating comment:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// PUT /api/quotes/:id/comments/:commentId - Edit own comment
router.put(
    '/:id/comments/:commentId',
    writeLimiter,
    authMiddleware,
    validate(updateCommentSchema),
    async (req, res) => {
        const quoteId = parseInt(req.validated.params.id, 10);
        const commentId = parseInt(req.validated.params.commentId, 10);
        const { content } = req.validated.body;
        const userId = req.user.id;

        try {
            const db = await getDb();

            const existing = await db.query(
                'SELECT id, user_id FROM quote_comments WHERE id = $1 AND quote_id = $2',
                [commentId, quoteId]
            );
            if (existing.rowCount === 0) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            const ownerId = existing.rows[0].user_id;
            if (!ownerId || ownerId !== userId) {
                return res.status(403).json({ error: 'Permission denied' });
            }

            const updated = await db.query(
                `
                UPDATE quote_comments
                SET content = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND quote_id = $3
                RETURNING id, quote_id, user_id, content, created_at, updated_at
            `,
                [content, commentId, quoteId]
            );

            res.json({
                ...updated.rows[0],
                user_email: req.user.email || null,
            });
        } catch (err) {
            console.error('Error updating comment:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// DELETE /api/quotes/:id/comments/:commentId - Delete own comment or admin delete any
router.delete(
    '/:id/comments/:commentId',
    writeLimiter,
    authMiddleware,
    validate(commentIdParamSchema),
    async (req, res) => {
        const quoteId = parseInt(req.validated.params.id, 10);
        const commentId = parseInt(req.validated.params.commentId, 10);
        const userId = req.user.id;
        const role = req.user.role;

        try {
            const db = await getDb();

            const existing = await db.query(
                'SELECT id, user_id FROM quote_comments WHERE id = $1 AND quote_id = $2',
                [commentId, quoteId]
            );
            if (existing.rowCount === 0) {
                return res.status(404).json({ error: 'Comment not found' });
            }

            const ownerId = existing.rows[0].user_id;
            const canDelete = role === 'admin' || (!!ownerId && ownerId === userId);
            if (!canDelete) {
                return res.status(403).json({ error: 'Permission denied' });
            }

            await db.query(
                'DELETE FROM quote_comments WHERE id = $1 AND quote_id = $2',
                [commentId, quoteId]
            );

            res.json({ message: 'Comment deleted' });
        } catch (err) {
            console.error('Error deleting comment:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// GET /api/quotes/:id - Get single quote by ID
// IMPORTANT: This must be LAST to avoid matching /timeline, /discovery, /search
router.get('/:id', validate(idParamSchema), async (req, res) => {
    try {
        const id = parseInt(req.validated.params.id, 10);
        const db = await getDb();
        
        const result = await db.query(`
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching quote:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/quotes - Create a new quote
router.post('/', writeLimiter, authMiddleware, validate(createQuoteSchema), async (req, res) => {
    const { text, author, subcategory_id, background_color, text_color, font_family, visibility } = req.validated.body;
    const userId = req.user.id;
    try {
        const db = await getDb();
        const result = await db.query(
            `INSERT INTO quotes (text, author, subcategory_id, background_color, text_color, font_family, visibility, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [text, author, subcategory_id, background_color, text_color, font_family, visibility || 'public', userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Quote create error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/quotes/:id - Update own quote
router.put('/:id', writeLimiter, authMiddleware, validate(updateQuoteSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    const { text, author, subcategory_id, background_color, text_color, font_family, visibility } = req.validated.body;
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const db = await getDb();
        
        // Check ownership
        const ownership = await db.query('SELECT user_id FROM quotes WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (ownership.rowCount === 0) return res.status(404).json({ error: 'Quote not found' });
        
        if (ownership.rows[0].user_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Not the creator.' });
        }

        const result = await db.query(
            `UPDATE quotes SET 
                text = COALESCE($1, text), 
                author = COALESCE($2, author), 
                subcategory_id = COALESCE($3, subcategory_id),
                background_color = COALESCE($4, background_color),
                text_color = COALESCE($5, text_color),
                font_family = COALESCE($6, font_family),
                visibility = COALESCE($7, visibility)
             WHERE id = $8 AND deleted_at IS NULL RETURNING *`,
            [text, author, subcategory_id, background_color, text_color, font_family, visibility, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Quote update error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/quotes/:id - Soft delete own quote
router.delete('/:id', writeLimiter, authMiddleware, validate(idParamSchema), async (req, res) => {
    const id = parseInt(req.validated.params.id, 10);
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const db = await getDb();
        
        // Check ownership
        const ownership = await db.query('SELECT user_id FROM quotes WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (ownership.rowCount === 0) return res.status(404).json({ error: 'Quote not found' });
        
        if (ownership.rows[0].user_id !== userId && role !== 'admin') {
            return res.status(403).json({ error: 'Permission denied. Not the creator.' });
        }

        // Soft delete: set deleted_at instead of actual deletion
        await db.query('UPDATE quotes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        res.json({ message: 'Quote deleted successfully' });
    } catch (err) {
        console.error('Quote delete error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
