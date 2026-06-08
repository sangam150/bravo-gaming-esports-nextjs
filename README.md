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
