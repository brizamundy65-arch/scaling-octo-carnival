# WeTalkTo — Technical Brief (Pre-Coding)

## Product Intent
WeTalkTo is a quote-first social app:
- Users browse a feed/discovery grid of quote cards.
- Clicking a quote opens a **public, shareable quote page** (SEO + OG share).
- Logged-in users can **publish** their own quote posts and **remix** existing quotes into new designs.
- Only the **creator (post author)** or an **admin** can edit/delete a published quote post.

## Current Architecture (as-is)
- Frontend: React + Vite + React Router (SPA), Tailwind UI.
- Backend: Express + PostgreSQL (with optional pg-mem for dev/demo).
- Nginx serves `dist/` and proxies `/api/*` to Node.
- Admin UI exists (`/admin/*`) and backend admin APIs exist (`/api/admin/*`).

## What Currently Doesn’t Make Sense / Key Gaps
### Content & UX
- **No public quote URL** in the UI (quotes are routed to `/create?...` for remixing/editing). This blocks SEO + link sharing.
- Quote “author” is overloaded:
  - `quotes.author` is the *attribution* (e.g., “Voltaire”) but UI treats it like a user profile.
  - Creator identity should come from `quotes.user_id` + user profile fields.
- Editor currently hardcodes `subcategory_id` for publishing (needs real selection).
- Deleting uses `confirm()` prompts; should be consistent UI dialogs.

### Security / Integrity
- `POST /api/interactions` trusts `userId` from the client → spoofable interactions + DB growth vector.
- Missing request validation (body/params) across many endpoints.
- Schema/migrations are not single-source-of-truth (e.g., `site_widgets`, `quotes.user_id` exist in DB via migration but not in `schema.sql`).

### SEO / Sharing
- SPA pages share identical HTML shell (static meta tags) → poor indexing and poor social previews.
- No `robots.txt` or `sitemap.xml` for quote pages.
- No stable canonical quote URLs (needed for SEO + deep links).

## Target End-State (recommended)
### 1) Public Quote Pages (SEO + share)
Create a public route:
- `GET /q/:id/:slug?` → **server-rendered HTML** (not SPA-only) with:
  - `<title>` per quote
  - `meta description` excerpt
  - Open Graph + Twitter card tags
  - JSON-LD structured data
  - Canonical URL

Nginx should route `/q/` to the backend (HTML), while SPA continues for `/app/*` or `/` as desired.

### 2) Clean Content Model
Separate “post creator” from “quote attribution”.
- `quotes.user_id` = creator user (nullable for seeded/system content)
- `quotes.author` = attribution (can stay, but UI must not treat it like the creator)
Add fields needed for stable URLs and moderation:
- `quotes.slug` (generated)
- `quotes.updated_at`
- `quotes.visibility` (`public` | `unlisted` | `private`)
- `quotes.deleted_at` (soft delete to preserve URLs)

### 3) Permissions (Creator/Admin Only)
Backend enforcement (already partly present in `/api/quotes/:id` update/delete):
- Only creator or admin can edit/delete.
Frontend enforcement:
- `/q/:id` is view-only for normal users.
- `/q/:id/edit` or `/create?edit=:id` only accessible when creator/admin.

### 4) Sharing That Actually Works
Sharing should be URL-first:
- Share button copies `https://wetalk.to/q/:id/:slug`.
- Optional: generate and store an OG image per quote:
  - `quotes.og_image_url` and/or
  - `GET /og/quote/:id.png` (server-generated image)

### 5) SEO Essentials
- `robots.txt`: allow `/q/*`, disallow `/admin/*`, `/create*`, and other non-canonical routes.
- `sitemap.xml`: generated from DB (quote URLs with lastmod).
- Ensure canonical host + https (Cloudflare can terminate TLS; origin TLS recommended for “Full (strict)”).

## Proposed API Surface (incremental)
Public:
- `GET /api/quotes/:id` (exists)
- `GET /api/quotes/search?q=` (exists)
- `GET /api/quotes/discovery` (exists)
- `GET /api/widgets` (exists)

Authenticated user:
- `POST /api/quotes` (exists)
- `PUT /api/quotes/:id` (exists)
- `DELETE /api/quotes/:id` (exists)
- `POST /api/interactions` (needs hardening: derive user from JWT when present, validate UUID, rate-limit)

Admin:
- `/api/admin/*` (exists) + add audit logging + better validation

## Milestones (recommended sequencing)
1. **M0: Security + operational correctness** — lock down deploy, harden interactions/auth, unify migrations.
2. **M1: Public quote pages + SEO foundation** — `/q/:id/:slug`, meta tags, sitemap/robots.
3. **M2: UX refactor around view vs remix vs edit** — click → detail page; edit gated; share uses canonical URL.
4. **M3: Publishing completeness** — category/subcategory selection, user profile, soft delete, visibility.
5. **M4: Social layer** — likes/bookmarks/comments/follow + notifications + moderation tools.

