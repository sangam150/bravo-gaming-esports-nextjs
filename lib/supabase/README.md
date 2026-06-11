# Supabase Layer

This folder is the new backend foundation for the Bravo Gaming Esports migration away from Firebase.

Files:

- `constants.ts`: canonical table, bucket, and role names
- `env.ts`: shared Supabase environment validation helpers
- `browser-client.ts`: browser client for public/admin UI
- `server-client.ts`: server client for Next.js route handlers and server components
- `service-role-client.ts`: secure admin-only/service-role client for privileged writes

Current status:

- Supabase clients and configuration helpers are in place.
- Firebase is still the active runtime backend in the rest of the app.
- The next migration step is replacing Firebase reads/writes route-by-route and feature-by-feature.
