const express = require('express');
const router = express.Router();
const path = require('path');
const { getDb } = require('../db');

const SITE_NAME = process.env.SITE_NAME || 'WeTalkTo';
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || 'https://wetalk.to').replace(/\/+$/, '');

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function slugify(value) {
    const base = String(value || '')
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const trimmed = base.slice(0, 80).replace(/-+$/g, '');
    return trimmed;
}

function buildQuoteSlug(quote) {
    return slugify(`${quote.text || ''} ${quote.author || ''}`.trim());
}

function buildQuoteUrl(quote) {
    const slug = buildQuoteSlug(quote);
    return `${PUBLIC_BASE_URL}/q/${quote.id}${slug ? `/${slug}` : ''}`;
}

function buildDescription(quote) {
    const base = `${quote.text || ''} - ${quote.author || 'Unknown'}`.trim();
    return base.length > 160 ? `${base.slice(0, 157)}...` : base;
}

function renderNotFound() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,follow" />
    <title>Quote not found | ${SITE_NAME}</title>
    <style>
      body { font-family: "Inter", system-ui, sans-serif; background: #f4f4f5; margin: 0; color: #18181b; }
      .wrap { max-width: 720px; margin: 0 auto; padding: 64px 24px; }
      .card { background: #fff; border-radius: 24px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      a { color: #18181b; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <div class="card">
        <h1>Quote not found</h1>
        <p>This link may be broken or the quote was removed.</p>
        <a href="/">Back to ${SITE_NAME}</a>
      </div>
    </main>
  </body>
</html>`;
}

function renderQuoteHtml(quote) {
    const title = `"${quote.text}" - ${quote.author || 'Unknown'} | ${SITE_NAME}`;
    const description = buildDescription(quote);
    const url = buildQuoteUrl(quote);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Quotation',
        text: quote.text,
        creator: quote.author ? { '@type': 'Person', name: quote.author } : undefined,
        datePublished: quote.created_at ? new Date(quote.created_at).toISOString() : undefined,
        url,
    };

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeText = escapeHtml(quote.text);
    const safeAuthor = escapeHtml(quote.author || 'Unknown');
    const safeCategory = escapeHtml(quote.category_name || '');
    const safeSubcategory = escapeHtml(quote.subcategory_name || '');

    const background = quote.background_color || '#ffffff';
    const textColor = quote.text_color || '#18181b';
    const fontFamily = quote.font_family || 'Inter, system-ui, sans-serif';

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${safeDescription}" />
    <meta name="theme-color" content="${escapeHtml(background)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; font-family: "Inter", system-ui, sans-serif; background: #f4f4f5; color: #18181b; }
      .wrap { max-width: 880px; margin: 0 auto; padding: 48px 24px 72px; }
      .meta { font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em; opacity: 0.6; }
      .card { margin-top: 20px; border-radius: 28px; padding: 40px; background: ${escapeHtml(background)}; color: ${escapeHtml(textColor)}; font-family: ${escapeHtml(fontFamily)}; box-shadow: 0 20px 50px rgba(0,0,0,0.12); }
      blockquote { margin: 0; font-size: clamp(24px, 4vw, 44px); line-height: 1.2; font-weight: 700; }
      .author { margin-top: 24px; font-size: 16px; font-weight: 600; opacity: 0.8; }
      .actions { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; }
      .btn { padding: 12px 20px; border-radius: 999px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
      .btn.primary { background: #18181b; color: #fff; }
      .btn.ghost { border: 1px solid rgba(0,0,0,0.15); color: #18181b; background: #fff; }
      .footer { margin-top: 28px; font-size: 13px; opacity: 0.7; }
    </style>
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body>
    <main class="wrap">
      <div class="meta">${safeCategory}${safeSubcategory ? ` · ${safeSubcategory}` : ''}</div>
      <article class="card">
        <blockquote>"${safeText}"</blockquote>
        <div class="author">- ${safeAuthor}</div>
      </article>
      <div class="actions">
        <a class="btn primary" href="/">Open ${escapeHtml(SITE_NAME)}</a>
      </div>
      <div class="footer">${escapeHtml(SITE_NAME)} · Share this quote: ${escapeHtml(url)}</div>
    </main>
  </body>
</html>`;
}

async function handleQuotePage(req, res) {
    // Detect Bot / Crawler vs Browser
    const userAgent = req.get('User-Agent') || '';
    const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|whatsapp/i.test(userAgent);

    // If not a bot, serve the React App (SPA) to let the client handle routing
    if (!isBot) {
        res.sendFile(path.join(__dirname, '../../dist/index.html'));
        return;
    }

    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
        res.status(404).send(renderNotFound());
        return;
    }

    try {
        const db = await getDb();
        const result = await db.query(
            `
            SELECT q.*, s.name as subcategory_name, c.name as category_name
            FROM quotes q
            JOIN subcategories s ON q.subcategory_id = s.id
            JOIN categories c ON s.category_id = c.id
            WHERE q.id = $1
        `,
            [id]
        );

        if (result.rowCount === 0) {
            res.status(404).send(renderNotFound());
            return;
        }

        const quote = result.rows[0];
        const canonical = buildQuoteUrl(quote);
        const slug = buildQuoteSlug(quote);
        const requestSlug = String(req.params.slug || '');

        if (slug && requestSlug !== slug) {
            res.redirect(301, canonical);
            return;
        }

        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(renderQuoteHtml(quote));
    } catch (err) {
        console.error('Error rendering quote page:', err);
        res.status(500).send(renderNotFound());
    }
}

router.get('/q/:id', handleQuotePage);
router.get('/q/:id/:slug', handleQuotePage);

router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /q/
Disallow: /admin/
Disallow: /create
Disallow: /auth
Disallow: /profile
Disallow: /search
Disallow: /discovery
Disallow: /api/

Sitemap: ${PUBLIC_BASE_URL}/sitemap.xml
`);
});

router.get('/sitemap.xml', async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.query(
            'SELECT id, text, author, created_at FROM quotes ORDER BY created_at DESC'
        );

        const urls = result.rows.map((quote) => {
            const loc = buildQuoteUrl(quote);
            const lastmod = quote.created_at
                ? new Date(quote.created_at).toISOString().split('T')[0]
                : null;
            return `
  <url>
    <loc>${escapeHtml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(PUBLIC_BASE_URL)}</loc>
  </url>${urls.join('')}
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Error generating sitemap:', err);
        res.status(500).type('text/plain').send('sitemap unavailable');
    }
});

module.exports = router;
