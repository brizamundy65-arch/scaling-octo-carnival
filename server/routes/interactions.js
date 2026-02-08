const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const router = express.Router();
const { getDb } = require('../db');
const { validate } = require('../middleware/validate');
const { ensureGuestId, getActorId } = require('../middleware/actor');
const { optionalAuthMiddleware } = require('../middleware/auth');

const interactionLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
});

const interactionSchema = z.object({
    body: z.object({
        quoteId: z.number().int().positive(),
        interactionType: z.enum(['view', 'like', 'remix', 'share']),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

// Record an interaction (guest via cookie, user via JWT)
router.post('/', interactionLimiter, ensureGuestId, optionalAuthMiddleware, validate(interactionSchema), async (req, res) => {
    try {
        const { quoteId, interactionType } = req.validated.body;
        const actorId = getActorId(req);

        const db = await getDb();

        // Ensure actor exists (guest sessions are stored as users with no email)
        const checkUser = await db.query('SELECT id FROM users WHERE id = $1', [actorId]);
        if (checkUser.rowCount === 0) {
            await db.query(
                'INSERT INTO users (id, email, role, is_verified) VALUES ($1, $2, $3, $4)',
                [actorId, null, 'guest', false]
            );
        }

        await db.query(
            'INSERT INTO user_interactions (user_id, quote_id, interaction_type) VALUES ($1, $2, $3)',
            [actorId, quoteId, interactionType]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error recording interaction:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
