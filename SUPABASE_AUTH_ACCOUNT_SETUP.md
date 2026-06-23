# Supabase Auth Account Setup

This note covers the current Milestone 2 auth setup for real Bravo accounts.

## Source Of Truth

- Preferred source of truth: `public.profiles`
- Compatibility fallback: `public.users`
- Runtime resolution order in the app:
  1. `profiles` by `auth_user_id`
  2. `users` by `auth_user_id`
  3. `app_metadata` on the Supabase Auth user
  4. `SUPABASE_AUTH_PROFILE_OVERRIDES_JSON` on the server

Use `profiles` for all new accounts.
Only mirror into `users` if you still need legacy compatibility.

## Important Current Limits

- Password reset is still a holding-state UI only at `/reset-password`.
- Player dashboard access still needs durable `playerId` linkage.
- `profiles` and `users` do not currently have a `player_id` column in the repo schema.
- For authorization data, use Auth `app_metadata`, not `user_metadata`.

## Step 1: Create The Supabase Auth User

Create the user first in Supabase Dashboard:

1. Open `Authentication -> Users`
2. Create the user or invite the user
3. Copy the Auth user UUID from `auth.users.id`
4. Use that UUID as `auth_user_id` in `profiles`

## Step 2: Create Or Update The Profile Row

Preferred SQL pattern for all real accounts:

```sql
insert into public.profiles (
  auth_user_id,
  email,
  display_name,
  role,
  team_id
)
values (
  '<AUTH_USER_UUID>',
  '<EMAIL>',
  '<DISPLAY_NAME>',
  '<ROLE>',
  <TEAM_ID_OR_NULL>
)
on conflict (auth_user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  team_id = excluded.team_id,
  updated_at = timezone('utc', now());
```

Optional legacy compatibility mirror:

```sql
insert into public.users (
  auth_user_id,
  email,
  name,
  role,
  team_id
)
values (
  '<AUTH_USER_UUID>',
  '<EMAIL>',
  '<DISPLAY_NAME>',
  '<ROLE>',
  <TEAM_ID_OR_NULL>
)
on conflict (auth_user_id) do update
set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  team_id = excluded.team_id;
```

## Admin Account Setup

Use this when promoting an account to `super_admin` or `admin`.

1. Create the Supabase Auth user
2. Insert or update the `profiles` row
3. Set `role = 'super_admin'` or `role = 'admin'`
4. Leave `team_id = null`
5. Optional: mirror into `users` only if legacy compatibility is still needed

Example:

```sql
insert into public.profiles (
  auth_user_id,
  email,
  display_name,
  role,
  team_id
)
values (
  '<AUTH_USER_UUID>',
  'admin@example.com',
  'Bravo Admin',
  'admin',
  null
)
on conflict (auth_user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  team_id = excluded.team_id,
  updated_at = timezone('utc', now());
```

## Team Account Setup

Use this for `team_igl` or `team_manager`.

1. Create the Supabase Auth user
2. Look up the real `teams.id`
3. Insert or update the `profiles` row with that `team_id`
4. Set `role = 'team_igl'` or `role = 'team_manager'`
5. Add the same `role` and `teamId` to Auth `app_metadata`

Example profile SQL:

```sql
insert into public.profiles (
  auth_user_id,
  email,
  display_name,
  role,
  team_id
)
values (
  '<AUTH_USER_UUID>',
  'team@example.com',
  'Bravo Team Manager',
  'team_igl',
  '<TEAM_UUID>'
)
on conflict (auth_user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  team_id = excluded.team_id,
  updated_at = timezone('utc', now());
```

Recommended Auth `app_metadata` for the same user:

```json
{
  "role": "team_igl",
  "teamId": "<TEAM_UUID>",
  "displayName": "Bravo Team Manager"
}
```

Note:

- `team_igl` is already present in the current repo enum/types.
- If your live database has not yet been aligned for `team_manager`, keep the `profiles` row in sync as far as the live enum allows, and put the intended role in `app_metadata` until schema alignment is completed.

## Player Account Setup

Use this for `player`.

1. Create the Supabase Auth user
2. Look up the real `players.id`
3. Insert or update the `profiles` row for the account
4. Set `playerId` in Auth `app_metadata`
5. Set `role = 'player'` in `profiles` if the live database role enum already supports it

Recommended Auth `app_metadata`:

```json
{
  "role": "player",
  "playerId": "<PLAYER_UUID>",
  "displayName": "Bravo Player"
}
```

Recommended profile SQL when the live database accepts `player`:

```sql
insert into public.profiles (
  auth_user_id,
  email,
  display_name,
  role,
  team_id
)
values (
  '<AUTH_USER_UUID>',
  'player@example.com',
  'Bravo Player',
  'player',
  null
)
on conflict (auth_user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  team_id = excluded.team_id,
  updated_at = timezone('utc', now());
```

Current limitation:

- The app can read `playerId` from Auth `app_metadata`, but there is not yet a durable `player_id` column in `profiles` or `users`.
- If the live database enum does not yet accept `player`, keep `playerId` and `role` in `app_metadata` or server-side overrides until schema alignment is done.

## Safe Fallback: Server Override

If you need to link an account before schema alignment is complete, use `SUPABASE_AUTH_PROFILE_OVERRIDES_JSON` on the server.

Example:

```json
{
  "admin@example.com": {
    "role": "admin",
    "displayName": "Bravo Admin"
  },
  "team@example.com": {
    "role": "team_manager",
    "teamId": "<TEAM_UUID>",
    "displayName": "Bravo Team Manager"
  },
  "player@example.com": {
    "role": "player",
    "playerId": "<PLAYER_UUID>",
    "displayName": "Bravo Player"
  }
}
```

Use this only as a compatibility bridge. The long-term goal should still be durable schema-backed linkage.
