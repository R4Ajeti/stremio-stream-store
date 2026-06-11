# Professional Upgrade Prompt for Stremio Stream Store

Use this prompt to guide improvements to the `stremio-stream-store` addon in this repository.

## Context

This project is a TypeScript/Fastify Stremio addon that lets users save and serve one custom stream URL per movie or TV episode. It stores links and analytics in Firebase Realtime Database, serves a small web UI from `/set`, exposes Stremio routes from `/manifest.json` and `/stream/...`, and supports Vercel through `api/index.ts`.

Current stack:

- TypeScript, Node.js 20, Fastify
- Firebase Admin SDK with Realtime Database
- Zod validation
- Static HTML/CSS/JavaScript UI in `public/`
- Vercel serverless deployment

Primary files to review and improve:

- `src/app.ts`
- `src/config/env.ts`
- `src/routes/link.route.ts`
- `src/routes/stream.route.ts`
- `src/routes/manifest.route.ts`
- `src/routes/analytics.route.ts`
- `src/services/link.service.ts`
- `src/services/analytics.service.ts`
- `src/services/firebase.service.ts`
- `src/validators/link.validator.ts`
- `src/types/link.type.ts`
- `public/main.js`
- `public/analytics.js`
- `public/styles.css`
- `public/analytics.css`
- `README.md`
- `package.json`
- `vercel.json`
- `.env.example`

## Goal

Make the addon feel production-ready, safer to host publicly, easier to maintain, and more polished for Stremio users. Keep the addon simple, but add the professional features that matter most: security, validation, reliability, observability, tests, documentation, and a better user experience.

## Highest-Priority Improvements

1. Add protection for public write endpoints.
   - Current issue: `POST /api/link/movie` and `POST /api/link/serie` appear to be publicly writable.
   - Add an optional `LINK_WRITE_TOKEN` or `ADMIN_TOKEN`.
   - Require `Authorization: Bearer <token>` for saving links when the token is configured.
   - Update the `/set` UI to accept and remember the token locally.
   - Return `401` with a clear JSON error when unauthorized.
   - Document the token in `.env.example` and `README.md`.

2. Strengthen URL validation.
   - Current issue: `url` only checks for a non-empty string.
   - Validate with `z.string().url()`.
   - Allow only safe playable protocols such as `http:` and `https:`.
   - Consider rejecting localhost, private network IPs, `file:`, `javascript:`, `data:`, and other unsafe schemes for hosted deployments.
   - Add clear validation messages for users.

3. Add rate limiting and abuse controls.
   - Add `@fastify/rate-limit`.
   - Apply stricter limits to `/api/link/*`.
   - Apply reasonable limits to `/api/analytics/routes` and stream routes.
   - Include useful response headers and JSON errors.

4. Add automated tests.
   - Add a test runner such as Vitest.
   - Cover validators, route behavior, stream responses, authorization, and link save/read logic.
   - Mock Firebase instead of hitting production.
   - Add scripts:
     - `test`
     - `test:watch`
     - `lint` if linting is added
   - Keep `typecheck` and `build` green.

5. Improve environment validation.
   - Replace manual env parsing with a typed Zod env schema or a dedicated config module.
   - Include all supported variables in one place:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY_BASE64`
     - `FIREBASE_DATABASE_URL`
     - `ADDON_BASE_URL`
     - `PORT`
     - `ANALYTICS_READ_TOKEN`
     - `ANALYTICS_TIME_ZONE`
     - `ANALYTICS_IP_SALT`
     - `LINK_WRITE_TOKEN` or `ADMIN_TOKEN`
   - Validate `ADDON_BASE_URL` as a URL.
   - Validate `ANALYTICS_TIME_ZONE` as a real IANA time zone if practical.
   - Avoid reading `process.env` directly outside `src/config/env.ts`.

6. Make Firebase access easier to test and safer to operate.
   - Introduce a small repository layer for links and analytics.
   - Avoid direct `RealtimeDb.ref(...)` calls scattered across services where possible.
   - Add safe error handling for Firebase failures.
   - Consider a Firebase emulator setup for local development and tests.
   - Document the expected Firebase security rules.

7. Improve Stremio manifest professionalism.
   - Move manifest version/name/description/logo/config into typed config.
   - Keep `version` synced with `package.json`.
   - Review whether the hard-coded `stremioAddonsConfig.signature` belongs in source.
   - Add optional metadata if useful:
     - `contactEmail`
     - `behaviorHints`
     - richer addon description
   - Confirm all manifest fields follow Stremio addon expectations.

8. Make stream responses richer and more useful.
   - Consider storing optional metadata with each link:
     - title/name
     - quality
     - language
     - source/provider
     - notes
   - Return a more descriptive stream title than `Custom Stream`.
   - Consider supporting multiple links per movie/episode instead of overwriting one link.
   - Add deletion and listing APIs if the addon is meant to be managed over time.

9. Improve route analytics reliability and privacy.
   - Current analytics is useful but hand-rolled and Firebase-heavy.
   - Make analytics opt-in or easy to disable with `ANALYTICS_ENABLED=false`.
   - Add retention cleanup for old `analytics/visitorDays` and visitors if needed.
   - Avoid counting internal/static noise unless intentionally desired.
   - Consider excluding health checks from audience analytics.
   - Keep raw IP addresses out of storage.
   - Make the salt required in production.

10. Improve frontend UX on `/set`.
    - Add a copy button for the manifest URL.
    - Add an install button using `stremio://` when possible.
    - Add clear success/error messages instead of raw JSON as the main feedback.
    - Keep raw JSON available behind a details toggle for debugging.
    - Add client-side validation for IMDb ID, season, episode, and URL before submitting.
    - Show when an existing link was overwritten.
    - Add a delete or replace confirmation flow if destructive changes are possible.

## Code Quality Improvements

1. Normalize naming style.
   - Current code uses names like `RequestObj`, `UrlStr`, and `SeasonInt`.
   - Either keep it consistently everywhere or migrate to conventional TypeScript names like `request`, `url`, `season`.
   - Do not mix styles within the same module.

2. Remove duplicated route tracking calls.
   - `trackRoute(...)` is called manually in every route.
   - Consider a Fastify hook or plugin that tracks matched routes automatically.
   - Preserve normalized route names such as `/stream/movie/:imdbId.json`.

3. Improve error handling.
   - Centralize Zod error formatting.
   - Return consistent API error shapes:
     ```json
     {
       "ok": false,
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "IMDb ID must look like tt1234567"
       }
     }
     ```
   - Avoid leaking internal error messages to public clients.

4. Add linting and formatting.
   - Add ESLint with TypeScript support.
   - Add Prettier or a clearly configured formatter.
   - Add scripts for `lint`, `format`, and `check`.

5. Add structured API schemas.
   - Use Fastify schema support where helpful.
   - Generate clearer route contracts from Zod schemas if practical.
   - Keep request and response types close to the validators.

6. Improve project hygiene.
   - Ensure `.DS_Store`, local service account JSON files, build outputs, and zip artifacts are ignored.
   - Keep secrets out of git.
   - Confirm `.env.example` is complete and safe.

## Suggested New Features

1. Link management dashboard.
   - List saved movie links.
   - List saved series links by IMDb ID, season, and episode.
   - Edit, replace, and delete links.
   - Add search/filter by IMDb ID.

2. Multiple streams per item.
   - Store an array or keyed map of streams per movie/episode.
   - Add fields for quality, language, title, source, and priority.
   - Return all saved streams to Stremio.

3. Import/export.
   - Export saved links as JSON.
   - Import a JSON backup with validation and dry-run mode.
   - Add migration tools if the database schema changes.

4. Metadata lookup.
   - Optionally fetch title/poster/year from IMDb-compatible metadata sources or Stremio metadata when available.
   - Cache metadata separately.
   - Do not make stream routes slow or fragile because of metadata lookup.

5. Admin-only analytics dashboard.
   - Reuse `ANALYTICS_READ_TOKEN`.
   - Add date range filters.
   - Add route search.
   - Add CSV export.
   - Add a clear privacy note.

6. Health and readiness endpoints.
   - Keep `/health` lightweight.
   - Add `/ready` to check Firebase connectivity.
   - Make monitoring easier on Vercel or other hosts.

## Documentation Improvements

1. Refresh `README.md`.
   - Add a quick start section.
   - Add a secure deployment checklist.
   - Add screenshots of `/set` and analytics if available.
   - Add Stremio installation instructions.
   - Add API examples for save, stream, list, update, and delete if those are implemented.
   - Add troubleshooting for Firebase private key base64 encoding.

2. Expand `.env.example`.
   - Include every env var.
   - Add safe placeholder values.
   - Explain which values are required in production.

3. Add `SECURITY.md`.
   - Explain supported versions.
   - Explain how to report vulnerabilities.
   - Mention that public write endpoints should be protected with a token.

4. Add `CHANGELOG.md`.
   - Track notable changes.
   - Follow Keep a Changelog style if desired.

5. Add deployment notes.
   - Vercel setup steps.
   - Firebase Realtime Database setup.
   - Firebase emulator setup.
   - Environment variable setup.

## UI and Design Improvements

1. Make `/set` feel like a focused admin tool.
   - Reduce oversized decorative styling.
   - Use a clean, practical layout with clear form grouping.
   - Keep mobile layouts polished.
   - Make buttons and form states consistent with analytics styling.

2. Improve accessibility.
   - Add visible focus states.
   - Ensure color contrast passes WCAG AA.
   - Add `aria-live` regions for form feedback.
   - Make copy/install buttons keyboard accessible.

3. Improve analytics UI.
   - Add loading, empty, unauthorized, and error states.
   - Add route filtering.
   - Add date range controls.
   - Avoid storing tokens in localStorage unless the user explicitly opts in, or clearly document the tradeoff.

4. Use real assets thoughtfully.
   - Keep the logo crisp at favicon and app-icon sizes.
   - Avoid unnecessary decorative gradients if they distract from the admin workflow.
   - Ensure all images have correct dimensions, alt behavior, and compression.

## Reliability and Deployment Checklist

Before considering the addon production-ready:

- `yarn typecheck` passes.
- `yarn build` passes.
- Tests pass locally.
- No secrets, Firebase JSON files, zip artifacts, or `.DS_Store` files are committed.
- Public write APIs are protected in production.
- Stream routes return valid Stremio JSON even when Firebase fails.
- Manifest route returns valid addon metadata.
- Firebase env vars are validated at startup.
- README setup instructions match the actual code.
- Vercel deployment works with the documented env vars.
- Local development works with `yarn dev`.

## Suggested Implementation Order

1. Add env schema and complete `.env.example`.
2. Add write-token authentication for `/api/link/movie` and `/api/link/serie`.
3. Strengthen URL validation and error responses.
4. Add tests for validation, auth, stream responses, and manifest.
5. Add rate limiting.
6. Refactor route analytics into a cleaner Fastify hook or plugin.
7. Improve `/set` UI feedback, copy/install controls, and client-side validation.
8. Update README, add `SECURITY.md`, and clean project hygiene.
9. Add optional advanced features such as multiple streams, list/edit/delete, import/export, and richer metadata.

## Acceptance Criteria

The improvement work is complete when:

- The addon can be safely hosted publicly without letting strangers overwrite links.
- Invalid IMDb IDs and unsafe URLs are rejected on both client and server.
- Main routes are covered by automated tests.
- The README and `.env.example` are accurate.
- The UI clearly communicates success, failure, authorization errors, and installation steps.
- Stremio stream responses remain fast, valid, and cache-safe.
- Analytics remains privacy-conscious and can be protected or disabled.
- Build, typecheck, and tests all pass.
