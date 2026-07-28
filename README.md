# Bravo Gaming Esports Next.js

Included:

- Professional homepage using your logo
- TrackD-inspired PUBG dashboard, compare experience, and section routes
- PUBG Scrims, Tournaments, Leaderboard, GTA V RP, MOSS/POV sections
- PUBG PC API backend routes

Setup:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Note: `npm run dev` now starts Next.js with webpack mode for stable local development.
Use `npm run dev:turbopack` only if you want to test Turbopack.

Admin dashboard:

- Visit `/admin` to access the PUBG control center
- Use the admin panel to import PUBG match and player data
- Upload logos, banners, media, and private evidence through the configured Cloudflare R2 buckets
- Persist documents through the Supabase-backed app document store
- Review recent server error logs from the admin settings panel

Public PUBG hub:

- Visit `/pubg` for the dedicated PUBG dashboard
- Visit `/pubg/events`, `/pubg/teams`, `/pubg/players`, `/pubg/results`, and `/pubg/compare` for section-specific entry points

PUBG API routes:

- `/api/pubg/players?name=PLAYER_NAME` returns a rate-limited public player-name projection.
- `/api/pubg/matches/MATCH_ID` returns a rate-limited public match summary without raw provider data.
- `/api/pubg/telemetry?matchId=MATCH_ID` is a same-origin platform-admin diagnostic endpoint.
- `/api/pubg/sync-player?name=PLAYER_NAME` is a same-origin platform-admin synchronization endpoint.

Admin helper routes:

- `POST /api/admin/pubg/match` with `matchId`
- `POST /api/admin/pubg/player` with `playerName`

Keep secret keys only in `.env.local`.

Quality gates:

- `npm run format:check` verifies repository formatting.
- `npm run lint` runs the Next.js ESLint rules.
- `npm run typecheck` runs strict TypeScript with unused-symbol checks.
- `npm run analyze` audits unused files, exports, and dependencies with Knip.
- `npm run qa:public` runs the complete public-route browser suite against `QA_BASE_URL` (localhost by default).

Production notes:

- Set `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) to your live domain for metadata, sitemap, and robots output
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` in Vercel
- Link the intended Supabase project and apply the ordered files in
  [`supabase/migrations`](./supabase/migrations) with `npm run supabase:db:push`
- Treat the UID-linked `public.profiles` row as the only application-role source;
  never grant access from email, OAuth metadata, or client-provided role values

QA-only visual data tools:

- `npm run qa:visual:seed` creates temporary public QA records for visual checks on PUBG match, team, and player detail routes.
- `npm run qa:visual:cleanup` removes those temporary QA records.
- All QA records are labeled with `QA VISUAL TEST - DO NOT USE`.
- These scripts are manual QA tools only. They are never executed automatically by app runtime, build, or production startup.
