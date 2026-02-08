# WeTalkTo — Milestones & Tracker

Reference: `scaling-octo-carnival/TECHNICAL_BRIEF.md`.

## Current State (2025-12-18)

- Live at `https://wetalk.to`
- Backend: Express + Postgres (seeded), `quoteflow` systemd service
- Admin login works; admin APIs available at `/api/admin/*`
- Quotes: timeline/discovery/search + CRUD (`POST/PUT/DELETE /api/quotes`, `GET /api/quotes/:id`)
- Quote details: SPA view page with canonical URLs + comments (`/q/:id/:slug`)
- Widgets: public `/api/widgets` + admin management
- Public quote pages + sitemap available (`/q/:id/:slug`, `/sitemap.xml`)

## Milestone 0 — Security + Ops Hardening (P0)

- [x] Remove committed secrets (`deploy.sh`, `server/create-admin.js`)
- [x] Move production secrets to `/etc/quoteflow/quoteflow.env`
- [x] Require `JWT_SECRET` in production
- [x] Use real Postgres in production + seed data
- [x] Switch deploy away from `root` (SSH keys + dedicated deploy user)
- [ ] Enable `fail2ban` + harden SSH (disable password auth after keys) — deferred per request
- [x] Lock down `POST /api/interactions` (derive user from JWT when present; validate UUID; rate limit)
- [x] Add request validation on all write endpoints (quotes/admin)
- [x] Restrict CORS in production (allowlist `wetalk.to`)
- [x] Make DB schema a single source of truth:
  - [x] Update `server/schema.sql` to include `quotes.user_id` + FKs + indexes
  - [x] Include `site_widgets` table in `server/schema.sql` (or add a proper migration runner)
- [ ] Origin TLS (recommended): configure Cloudflare “Full (strict)” with origin cert/LE

## Milestone 1 — Public Quote URLs + SEO Foundation (P0)

- [x] Add public quote route `/q/:id/:slug` that returns HTML with per-quote meta tags
- [x] Add `robots.txt` (index `/q/*`, block `/admin/*`, `/create*`) — note: Cloudflare managed robots overrides on domain
- [x] Add `sitemap.xml` generated from DB quote URLs (+ `lastmod`)
- [x] Canonical URL strategy (one canonical per quote; avoid query-param duplicates)
- [x] Add JSON-LD structured data on quote pages

## Milestone 2 — View vs Remix vs Edit UX (P1)

- [x] Clicking a quote opens `/q/:id` (view-only), not the editor
- [x] Remix from quote page → `/create?remix=:id`
- [x] Edit gated to creator/admin only (`/q/:id/edit` or `/create?edit=:id`)
- [x] Share uses canonical quote URL (copy link + share sheet)
- [x] Explore grid redesign + filters/shuffle (masonry layout)
- [x] Wire key UI actions (feed tabs, filter button, right sidebar CTAs)
- [x] Fix API validation for GET requests (allow empty body)
- [x] Timeline header shows `Author:` with last-name emphasis (no avatar)

## Milestone 3 — Publishing Completeness (P1)

- [x] Category/subcategory picker in editor (remove hardcoded `subcategory_id`)
- [ ] Separate “creator” vs “attribution author” in UI (stop treating `quotes.author` as a user profile)
- [x] Add quote visibility (`public`/`unlisted`/`private`)
- [x] Add `updated_at` + soft delete (`deleted_at`) to preserve URLs + SEO
- [x] Profile becomes server-backed (published quotes + saved drafts)

## Milestone 4 — Social Layer (P1/P2)

- [x] Likes/bookmarks persistence + counts
- [x] Comments: list + post + edit/delete (owner); delete-any (admin)
- [ ] Comments moderation (report, rate-limit tuning, admin review UI)
- [ ] Follow graph + “Following” feed
- [ ] Notifications (optional)

## Milestone 5 — Growth + Shareability (P2)

- [ ] OG image strategy per quote:
  - [ ] store uploaded image URL, or
  - [ ] server-generate `og:image` endpoint per quote
- [ ] Search ranking improvements (Postgres trigram + boosts)
- [ ] Performance: remove `ORDER BY RANDOM()` for scale; add pagination everywhere
