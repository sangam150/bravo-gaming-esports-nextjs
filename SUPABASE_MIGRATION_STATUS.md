# Supabase Migration Status

This repository is still running on Firebase today.

What is done in this migration slice:

- Added Supabase dependencies: `@supabase/supabase-js`, `@supabase/ssr`
- Added Supabase client helpers in [lib/supabase](./lib/supabase)
- Added initial relational schema and Bravo seed SQL in [supabase/schema.sql](./supabase/schema.sql)
- Added Supabase environment variables to [.env.example](./.env.example)

What is not done yet:

- Firebase is still the active runtime backend
- Route handlers still read/write Firebase
- Realtime hooks still use Firestore listeners
- Storage uploads still use Firebase Storage
- Auth still depends on Firebase auth/session logic

## Firebase Surface Area Still To Replace

Core backend files:

- [lib/firebase.ts](./lib/firebase.ts)
- [lib/firebase-client.ts](./lib/firebase-client.ts)
- [lib/firebase-storage.ts](./lib/firebase-storage.ts)
- [lib/firebase-auth-server.ts](./lib/firebase-auth-server.ts)
- [lib/data.ts](./lib/data.ts)
- [lib/pubg-sync.ts](./lib/pubg-sync.ts)
- [lib/realtime-hooks.tsx](./lib/realtime-hooks.tsx)
- [lib/server-monitoring.ts](./lib/server-monitoring.ts)

High-impact API routes:

- [app/api/admin/upload/route.ts](./app/api/admin/upload/route.ts)
- [app/api/admin/scrims/route.ts](./app/api/admin/scrims/route.ts)
- [app/api/admin/pending-imports/route.ts](./app/api/admin/pending-imports/route.ts)
- [app/api/admin/pending-imports/[id]/route.ts](./app/api/admin/pending-imports/[id]/route.ts)
- [app/api/admin/pubg/watchers/route.ts](./app/api/admin/pubg/watchers/route.ts)
- [app/api/admin/pubg/player/route.ts](./app/api/admin/pubg/player/route.ts)
- [app/api/cron/sync-matches/route.ts](./app/api/cron/sync-matches/route.ts)

## Recommended Cutover Order

1. Replace config/auth foundation
   - Add Supabase session helpers
   - Replace admin auth checks
   - Add role lookups from `public.users`

2. Replace uploads/storage
   - Port `app/api/admin/upload/route.ts`
   - Switch logo/banner/photo URLs to Supabase Storage

3. Replace core database reads/writes
   - Create `lib/supabase-data.ts`
   - Port seasons, days, teams, players, matches, pending imports

4. Replace PUBG import persistence
   - Write pending imports into `pending_imports`
   - Publish into `matches`, `match_results`, `match_players`
   - Replace Firestore write batches with SQL transactions or RPC functions

5. Replace realtime subscriptions
   - Swap Firestore listeners in `lib/realtime-hooks.tsx`
   - Subscribe only to live results, leaderboards, and pending import updates

6. Remove Firebase
   - Delete Firebase libs and env vars
   - Remove Firebase rules files
   - Remove `firebase` and `firebase-admin` from dependencies

## Important Note

The current repository is not yet "fully migrated to Supabase". This commit adds the real Supabase foundation, schema, and migration map so the next steps can be executed safely and incrementally without breaking the live tournament workflow.
