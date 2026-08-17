---
name: testing-zapilink-local
description: How to stand up a full local zapilink (Next.js + Supabase) environment for end-to-end runtime testing, apply the SQL migrations in scripts/, create test users/profiles, and exercise authenticated APIs without extracting cookies.
---

# End-to-end testing zapilink locally

Use this when a PR needs runtime verification (dashboard, public profile pages, `/api/**`)
and no remote Supabase credentials are available.

## 1. Local Supabase stack (no remote secrets needed)
- The Supabase CLI may not be installed and `npm i -g supabase` fails (permissions).
  Download the CLI binary directly to `~/bin/supabase` instead.
- `supabase init && supabase start` in a scratch dir (e.g. `/tmp/sbtest`) gives:
  API `http://127.0.0.1:54321`, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`,
  Studio `:54323`, Mailpit `:54324`. DB container name is `supabase_db_<dir>` (e.g. `supabase_db_sbtest`).
- Point `.env.local` at the local stack (`NEXT_PUBLIC_SUPABASE_URL`, anon key,
  `SUPABASE_SERVICE_ROLE_KEY` printed by `supabase start`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`).

## 2. Schema
Apply, in order: `supabase/schema.sql`, then every migration in `scripts/*.sql` that the feature
depends on (multi-profile, blocks, social-links, schedule, access-delegation, and the PR's own
migration such as `scripts/migrate-loyalty.sql`).

Environment-only fixes that may still be needed (these are gaps between the repo SQL and the app):
```sql
alter table public.profiles add column if not exists created_at timestamptz not null default now();
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
```
Without the grants the dashboard shows `permission denied for table profiles`.

## 3. Test users
Create auth users via the local Auth admin API (service role) and insert matching `profiles`
rows. Create TWO users/profiles so cross-tenant authorization can be tested (e.g. `@salaotest`
and `@outrotest`). Log into `/auth/login` in the browser with the created credentials.

## 4. Exercising authenticated APIs
Do NOT copy browser cookies into curl. Instead run `fetch('/api/...')` from the browser console
on an already-logged-in `localhost:3000` page (same origin ⇒ session cookies are sent), and
`console.log` the status + JSON. Read the logs with a second console call — the first call only
returns the evaluated value.

Public/unauthenticated endpoints and 401 checks are fine with plain `curl`.
Verify state invariants with `docker exec supabase_db_<dir> psql -U postgres -d postgres -c "..."`.

## 5. Repo gotchas
- `npm run lint` is broken (`next lint` removed in Next 16); use `npx tsc --noEmit`.
- Next dev warns the `middleware` convention is deprecated in favour of `proxy`; harmless.
- Server-rendered pages: assert on the HTML from `curl` (RSC payload includes the strings) when
  you want to avoid screenshots.

## Devin Secrets Needed
None for the local stack. A remote-project run would need the real `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` plus dashboard login credentials.
