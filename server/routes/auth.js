const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { sendWelcomeEmail } = require('../mailer');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { validate } = require('../middleware/validate');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

const authBodySchema = z.object({
    body: z.object({
        email: z.string().trim().email(),
        password: z.string().min(8).max(200),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

// Helper to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// POST /api/auth/register
router.post('/register', authLimiter, validate(authBodySchema), async (req, res) => {
    const { email, password } = req.validated.body;
    try {
        const db = await getDb();
        
        // Check if user exists
        const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rowCount > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const userId = uuidv4();

        // Create user
        const result = await db.query(
            'INSERT INTO users (id, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, created_at',
            [userId, email, passwordHash, 'user', false]
        );

        const newUser = result.rows[0];
        const token = generateToken(newUser);

        // Send welcome email (async, don't wait)
        sendWelcomeEmail(email).catch(console.error);

        res.status(201).json({ user: newUser, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(authBodySchema), async (req, res) => {
    const { email, password } = req.validated.body;
    try {
        const db = await getDb();
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials (no password set)' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        
        // Return user info without password
        delete user.password_hash;
        
        res.json({ user, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const db = await getDb();
        const result = await db.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [decoded.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

const profileUpdateSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(100).optional(),
    }),
    query: z.object({}).passthrough(),
    params: z.object({}).passthrough(),
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authLimiter, validate(profileUpdateSchema), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { name } = req.validated.body;
        
        const db = await getDb();
        const result = await db.query(
            'UPDATE users SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, email, name, role, created_at',
            [name, decoded.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Profile update error:', err);
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

