const nodemailer = require('nodemailer');
const { getDb } = require('./db');

// Cache settings briefly to avoid hitting DB on every email
let settingsCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 60000; // 1 minute

async function getSmtpSettings() {
    // Check cache
    if (settingsCache && (Date.now() - lastCacheUpdate < CACHE_TTL)) {
        return settingsCache;
    }

    try {
        const db = await getDb();
        const res = await db.query('SELECT key, value FROM system_settings WHERE key IN (\'smtp_host\', \'smtp_port\', \'smtp_user\', \'smtp_pass\', \'smtp_from\')');

        const settings = {};
        res.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        // Use DB settings if available, otherwise fallback to env
        const config = {
            host: settings.smtp_host || process.env.EMAIL_HOST,
            port: settings.smtp_port || process.env.EMAIL_PORT,
            user: settings.smtp_user || process.env.EMAIL_USER,
            pass: settings.smtp_pass || process.env.EMAIL_PASS,
            from: settings.smtp_from || process.env.EMAIL_FROM || '"QuoteFlow" <noreply@wetalk.to>',
        };

        settingsCache = config;
        lastCacheUpdate = Date.now();
        return config;

    } catch (error) {
        console.error('Error fetching SMTP settings:', error);
        // Fallback to env on error
        return {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
            from: process.env.EMAIL_FROM || '"QuoteFlow" <noreply@wetalk.to>',
        };
    }
}

const sendEmail = async ({ to, subject, html }) => {
    const settings = await getSmtpSettings();

    if (!settings.host) {
        console.log('Mock Email Sent (No SMTP Config):', { to, subject });
        return;
    }

    // Determine secure connection based on port
    // 465 is typically implicit SSL
    const isSecure = settings.port == 465;

    const transporter = nodemailer.createTransport({
        host: settings.host,
        port: parseInt(settings.port),
        secure: isSecure,
        auth: {
            user: settings.user,
            pass: settings.pass,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: settings.from,
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const sendWelcomeEmail = async (email) => {
    await sendEmail({
        to: email,
        subject: 'Welcome to QuoteFlow!',
        html: `
            <h1>Welcome to QuoteFlow!</h1>
            <p>We are excited to have you on board. Start creating and sharing beautiful quotes today.</p>
            <p>Best,<br>The QuoteFlow Team</p>
        `
    });
};

module.exports = { sendEmail, sendWelcomeEmail };
