# Supabase Layer

This folder contains the active Supabase backend foundation for Bravo Gaming Esports.

Files:

- `constants.ts`: canonical table, bucket, and role names
- `env.ts`: shared Supabase environment validation helpers
- `browser-client.ts`: browser client for public/admin UI
- `server-client.ts`: server client for Next.js route handlers and server components
- `service-role-client.ts`: secure admin-only/service-role client for privileged writes

Current status:

- Supabase clients and configuration helpers are in place.
- Admin auth, uploads, and the shared document-store runtime are now Supabase-backed.
- The next migration step is moving more tournament/match workflows from document storage into the relational schema and RLS-protected tables.
