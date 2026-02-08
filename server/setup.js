const fs = require('fs');
const path = require('path');
const { categories, subcategories, quotes } = require('./seed');

const initialWidgets = [
    {
        key: 'trending_topics',
        title: 'Trending Topics',
        content: ['#Mindfulness', '#Creativity', '#TechLife', '#Motivation', '#Stoic']
    },
    {
        key: 'who_to_follow',
        title: 'Who to follow',
        content: [
            {
                name: 'James Clear',
                handle: '@jamesclear',
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2fOTyAn_VRu7xEuIgVsy7sRFSrQSZMdCoDbEPJuJdmRfdqx_ZaW9oKGXfrkgaJeS-5eVSojhjXl13VcwOJJr9WLBjg_mufmiBi4USi5Ss8pj0lGKrFpyit0IJTg6tii_zM1269M5n9ETD5puB55y0wGqalnsvHCdEhJHvFB-OiGh2P06nY-dnY_EdHvSI5ujlj29tgo4OYPCLEoAst7x21Itafso9HWtkyLbcJc_WQZm6I8ptntkKeI32NNi3L7xe5_mLEmAqCJw',
            },
            {
                name: 'Brené Brown',
                handle: '@brenebrown',
                img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBh-NrzSKfbxKtg7K9SZM0uVZchpYsZIxqf3_qB3YflNqBHBsk6dEQtU0NZHdXY2BfIfbcQtBQ2xOFJ0-YMc8un4FtK0pe6SmPqi2N6mSUF0Jj-hFkNbzhMc8MQolTFXJIjirLFPP_Ro6BBRfQx2YpFOq2erSrzV_wFEc8ejcSOr2PgX9Bt4WsgN3_suZsccWuKfZ647MhcQft-IjiYP1BYclzJe9L8YNqb9y0_Cq5HOMe7h7lK9ycSyYvCakCJmv8MK-I5yIoRpm8',
            },
        ],
    },
    {
        key: 'premium_banner',
        title: 'Premium Banner',
        content: {
            badge: 'WeTalkTo Pro',
            description: 'Unlock exclusive themes and advanced analytics.',
            buttonText: 'Try for free',
        },
    },
];

async function seedWidgets(pool) {
    for (const widget of initialWidgets) {
        await pool.query(
            `
            INSERT INTO site_widgets (key, title, content)
            VALUES ($1, $2, $3)
            ON CONFLICT (key) DO NOTHING
        `,
            [widget.key, widget.title, JSON.stringify(widget.content)]
        );
    }
    console.log(`Seeded ${initialWidgets.length} widgets.`);
}

module.exports = {
    run: async (pool, options = {}) => {
        const { seed = true } = options;
        console.log('Running setup...');

        // 1. Run Schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Better splitting: remove comments, split by semicolon, trim
        const statements = schemaSql
            .replace(/--.*$/gm, '') // Remove comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            try {
                await pool.query(stmt);
            } catch (e) {
                // Allow idempotent-ish runs against an already-provisioned Postgres DB
                // (pg-mem + fresh Postgres won't hit these).
                const code = e && typeof e === 'object' ? e.code : undefined;
                const message = e && typeof e === 'object' ? String(e.message || '') : '';
                const alreadyExists =
                    code === '42P07' || // duplicate_table
                    code === '42710' || // duplicate_object
                    message.includes('already exists');

                if (alreadyExists) continue;
                console.error('Error running schema statement:', stmt);
                throw e;
            }
        }
        console.log('Schema applied.');

        // Widgets are configuration content; seed defaults if missing (safe for prod)
        await seedWidgets(pool);

        if (!seed) {
            console.log('Seed disabled; setup complete.');
            return;
        }

        // 2. Seed Categories
        const categoryMap = new Map(); // Name -> ID

        for (const cat of categories) {
            const res = await pool.query(
                'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
                [cat.name, cat.description]
            );
            categoryMap.set(cat.name, res.rows[0].id);
        }
        console.log(`Seeded ${categories.length} categories.`);

        // 3. Seed Subcategories
        const subcategoryMap = new Map(); // Name -> ID

        for (const sub of subcategories) {
            const catId = categoryMap.get(sub.category);
            if (!catId) {
                console.error(`Category not found for subcategory: ${sub.name}`);
                continue;
            }

            const res = await pool.query(
                'INSERT INTO subcategories (category_id, name, tags) VALUES ($1, $2, $3) RETURNING id',
                [catId, sub.name, sub.tags]
            );
            subcategoryMap.set(sub.name, res.rows[0].id);
        }
        console.log(`Seeded ${subcategories.length} subcategories.`);

        // 4. Seed Quotes
        for (const q of quotes) {
            const subId = subcategoryMap.get(q.subcategory);
            if (!subId) {
                console.error(`Subcategory not found for quote: "${q.text}" (${q.subcategory})`);
                continue;
            }

            await pool.query(
                'INSERT INTO quotes (text, author, subcategory_id) VALUES ($1, $2, $3)',
                [q.text, q.author, subId]
            );
        }
        console.log(`Seeded ${quotes.length} quotes.`);
    }
};
