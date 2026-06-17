# Supabase Migration Status

The active runtime backend is now Supabase.

Completed in this cutover:

- Removed Firebase auth, storage, and realtime package usage from the running app
- Switched admin login/session validation to Supabase-backed auth verification
- Switched uploads to Supabase Storage buckets
- Switched the shared document-store runtime to Supabase only
- Removed Firebase rules files and legacy Firebase client/server helper modules
- Added a dedicated `/pubg` dashboard plus `/pubg/*` section routes and compare pages

Current architecture:

- Auth: Supabase session + server-side admin verification
- Document data: `public.app_documents`
- Media uploads: Supabase Storage
- Realtime subscriptions: Supabase Realtime on `public.app_documents`

Still worth improving in future slices:

- Replace compatibility naming like `lib/firebase.ts` and `firestore-collections.ts` with Supabase-native names
- Move high-volume tournament/match persistence from the document store into the relational tables/views already defined in `supabase/schema.sql`
- Build the remaining team IGL workflow and richer admin CRUD around relational tables
- Expand empty-state cleanup across every legacy page that still says "not imported yet"
