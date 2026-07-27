# Supabase Layer

This directory contains the active Supabase client boundary:

- `env.ts` validates the project URL and public-key configuration.
- `client.ts` creates the browser client.
- `server.ts` creates the cookie-aware Server Component and Route Handler client.
- `proxy.ts` refreshes browser sessions before protected-route authorization.
- `service-role-client.ts` creates the server-only privileged client.

Authorization comes from the UID-linked `public.profiles` row. Email addresses, OAuth
metadata, and client-provided role values are never authorization sources. Schema
changes belong in the ordered files under `supabase/migrations`; do not edit Auth
tables manually.
