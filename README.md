# Bravo Gaming Esports Next.js Starter

Included:
- Professional homepage using your logo
- PUBG Scrims, Tournaments, Leaderboard, GTA V RP, MOSS/POV sections
- PUBG PC API backend routes
- Final Cursor prompt

Setup:
```bash
npm install
cp .env.example .env.local
npm run dev
```

Note: `npm run dev` now starts Next.js with webpack mode for stable local development.
Use `npm run dev:turbopack` only if you want to test Turbopack.

Admin dashboard:
- Visit `/admin` to access the PUBG + Firebase control center
- Use the admin panel to import PUBG match and player data
- Fetch Firestore collections and persist imported summaries when Firebase is configured
- Review recent server error logs from the admin settings panel

PUBG API routes:
- `/api/pubg/players?name=PLAYER_NAME`
- `/api/pubg/matches/MATCH_ID`
- `/api/pubg/telemetry?matchId=MATCH_ID`
- `/api/pubg/sync-player?name=PLAYER_NAME`

Admin helper routes:
- `POST /api/admin/pubg/match` with `matchId` and optional `saveToFirebase`
- `POST /api/admin/pubg/player` with `playerName` and optional `saveToFirebase`
- `POST /api/admin/firebase` with `collectionName`

Keep secret keys only in `.env.local`.

Production notes:
- Set `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`) to your live domain for metadata, sitemap, and robots output
- Deploy `firestore.rules` and `storage.rules` to keep client-side Firebase access locked down
- Set the exact Firebase Storage bucket name in both `FIREBASE_STORAGE_BUCKET` and `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
