# Staywise Software

## Setup

1. Copy `.env.example` to `.env.local` and set your Supabase project URL and anon key.
2. Run `npm ci`.
3. Apply the migrations with `supabase db push` against the intended project, then deploy required Edge Functions with `supabase functions deploy`.
4. Start the app with `npm run dev`.

Never put service-role keys, Stripe secret keys, OTA credentials, or real test-account passwords in `VITE_*` variables or committed files. Store server-only values as Supabase Edge Function secrets.

## Quality checks

Run `npm run typecheck`, `npm run lint`, and `npm run build` before deployment.

## End-to-end tests

Install browsers once with `npx playwright install chromium`. Set `E2E_BASE_URL`, `E2E_EMAIL`, and `E2E_PASSWORD`, then run `npm run test:e2e`.

The primary-module suite visits each major product area. Destructive-action tests stop at the confirmation dialog by default. They only perform a mutation when `E2E_ALLOW_MUTATIONS=true` and must use isolated seeded test data.
