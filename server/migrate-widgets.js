const fs = require('fs');
const dotenv = require('dotenv');

// Load environment from /etc/quoteflow/quoteflow.env if it exists
const envPath = '/etc/quoteflow/quoteflow.env';
if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const { getDb } = require('./db');

async function migrate() {
    const pool = await getDb();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('Checking for quotes table...');
        const tableCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'quotes'
        `);

        if (tableCheck.rows.length > 0) {
            console.log('Adding user_id to quotes table...');
            await client.query(`
                ALTER TABLE quotes 
                ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
            `);
        } else {
            console.log('Table "quotes" does not exist, skipping alteration.');
        }

        console.log('Creating site_widgets table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS site_widgets (
                id SERIAL PRIMARY KEY,
                key VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(100),
                content JSONB NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed initial widgets if they don't exist
        console.log('Seeding initial widgets...');
        const initialWidgets = [
            {
                key: 'trending_topics',
                title: 'Trending Topics',
                content: JSON.stringify(['#Mindfulness', '#Creativity', '#TechLife', '#Motivation', '#Stoic'])
            },
            {
                key: 'who_to_follow',
                title: 'Who to follow',
                content: JSON.stringify([
                    { name: 'James Clear', handle: '@jamesclear', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2fOTyAn_VRu7xEuIgVsy7sRFSrQSZMdCoDbEPJuJdmRfdqx_ZaW9oKGXfrkgaJeS-5eVSojhjXl13VcwOJJr9WLBjg_mufmiBi4USi5Ss8pj0lGKrFpyit0IJTg6tii_zM1269M5n9ETD5puB55y0wGqalnsvHCdEhJHvFB-OiGh2P06nY-dnY_EdHvSI5ujlj29tgo4OYPCLEoAst7x21Itafso9HWtkyLbcJc_WQZm6I8ptntkKeI32NNi3L7xe5_mLEmAqCJw' },
                    { name: 'Brené Brown', handle: '@brenebrown', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBh-NrzSKfbxKtg7K9SZM0uVZchpYsZIxqf3_qB3YflNqBHBsk6dEQtU0NZHdXY2BfIfbcQtBQ2xOFJ0-YMc8un4FtK0pe6SmPqi2N6mSUF0Jj-hFkNbzhMc8MQolTFXJIjirLFPP_Ro6BBRfQx2YpFOq2erSrzV_wFEc8ejcSOr2PgX9Bt4WsgN3_suZsccWuKfZ647MhcQft-IjiYP1BYclzJe9L8YNqb9y0_Cq5HOMe7h7lK9ycSyYvCakCJmv8MK-I5yIoRpm8' }
                ])
            },
            {
                key: 'premium_banner',
                title: 'Premium Banner',
                content: JSON.stringify({
                    badge: 'WeTalkTo Pro',
                    description: 'Unlock exclusive themes and advanced analytics.',
                    buttonText: 'Try for free'
                })
            }
        ];

        for (const widget of initialWidgets) {
            await client.query(`
                INSERT INTO site_widgets (key, title, content)
                VALUES ($1, $2, $3)
                ON CONFLICT (key) DO NOTHING;
            `, [widget.key, widget.title, widget.content]);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
