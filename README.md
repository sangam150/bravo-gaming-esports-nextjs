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
- Upload logos, banners, and media through Supabase Storage
- Persist documents through the Supabase-backed app document store
- Review recent server error logs from the admin settings panel

Public PUBG hub:
- Visit `/pubg` for the dedicated PUBG dashboard
- Visit `/pubg/events`, `/pubg/teams`, `/pubg/players`, `/pubg/results`, and `/pubg/compare` for section-specific entry points

PUBG API routes:
- `/api/pubg/players?name=PLAYER_NAME`
- `/api/pubg/matches/MATCH_ID`
- `/api/pubg/telemetry?matchId=MATCH_ID`
- `/api/pubg/sync-player?name=PLAYER_NAME`

Admin helper routes:
- `POST /api/admin/pubg/match` with `matchId`
- `POST /api/admin/pubg/player` with `playerName`

Keep secret keys only in `.env.local`.

Production notes:
- Set `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) to your live domain for metadata, sitemap, and robots output
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY` in Vercel
- Run the SQL in [supabase/schema.sql](./supabase/schema.sql) before using the admin data tools

QA-only visual data tools:
- `npm run qa:visual:seed` creates temporary public QA records for visual checks on PUBG match, team, and player detail routes.
- `npm run qa:visual:cleanup` removes those temporary QA records.
- All QA records are labeled with `QA VISUAL TEST - DO NOT USE`.
- These scripts are manual QA tools only. They are never executed automatically by app runtime, build, or production startup.
