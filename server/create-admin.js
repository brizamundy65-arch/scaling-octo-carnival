const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');
require('dotenv').config();

const createAdmin = async () => {
    const email = 'admin@wetalk.to';
    const password = 'admin0501aS!!';

    if (!password) {
        console.error('ADMIN_PASSWORD is required to create the admin user.');
        process.exit(1);
    }

    try {
        const db = await getDb();
        console.log('Connected to database...');

        // Check verification
        const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        if (existing.rowCount > 0) {
            await db.query(
                'UPDATE users SET password_hash = $1, role = $2, is_verified = $3 WHERE email = $4',
                [passwordHash, 'admin', true, email]
            );
            console.log('Admin user updated successfully.');
            process.exit(0);
        }

        const userId = uuidv4();
        await db.query(
            'INSERT INTO users (id, email, password_hash, role, is_verified) VALUES ($1, $2, $3, $4, $5)',
            [userId, email, passwordHash, 'admin', true]
        );

        console.log('Admin user created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
};

createAdmin();
