# Stremio Stream Store

Save and serve one custom Stremio stream link per movie or TV episode using IMDb IDs.

## Features

- Simple browser UI for saving movie and TV episode stream links
- Firebase Realtime Database storage through Firebase Admin SDK
- Automatic overwrite when the same movie or episode is saved again
- Stremio-compatible manifest and stream endpoints
- TypeScript + Fastify backend
- Compatible with BeamUp-style long-running Node hosting and Vercel serverless functions

## Project Structure

```txt
stremio-stream-store/
├── api/
│   └── index.ts              # Vercel serverless entrypoint
├── public/
│   ├── logo.png
│   ├── main.js
│   └── styles.css
├── src/
│   ├── app.ts                # Shared Fastify app factory
│   ├── server.ts             # BeamUp/local Node entrypoint
│   ├── config/
│   │   └── env.ts
│   ├── routes/
│   │   ├── link.route.ts
│   │   ├── manifest.route.ts
│   │   ├── stream.route.ts
│   │   └── ui.route.ts
│   ├── services/
│   │   ├── firebase.service.ts
│   │   └── link.service.ts
│   ├── types/
│   │   └── link.type.ts
│   ├── utils/
│   │   └── response.util.ts
│   └── validators/
│       └── link.validator.ts
├── app.json                  # BeamUp health check config
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## Required Environment Variables

```env
ADDON_BASE_URL=https://your-domain.example.com
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_BASE64=base64-encoded-private-key
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
PORT=3000
```

`PORT` is required only for local/BeamUp runtime. Vercel injects its own serverless request handling and does not use `PORT`.

### Generate `FIREBASE_PRIVATE_KEY_BASE64`

From your Firebase service account JSON file:

```bash
node -e "const key=require('./service-account.json').private_key; console.log(Buffer.from(key, 'utf8').toString('base64'))"
```

## Development

```bash
yarn install
yarn dev
```

Open:

```txt
http://localhost:3000
```

## Build and Start

```bash
yarn build
yarn start
```

`yarn build` compiles the BeamUp/local server to `dist/`. Vercel uses `api/index.ts` as the serverless function entrypoint.

## Vercel Deployment Notes

- Keep only one Vercel function entrypoint at `api/index.ts`.
- Do not commit `api/index.js` beside `api/index.ts`; Vercel treats both as the same route and fails with a conflicting paths error.
- `vercel.json` rewrites all requests to `/api/index`, where the shared Fastify app handles UI, manifest, stream, health, and API routes.
- Configure the same Firebase and addon environment variables in Vercel Project Settings.
- Set `ADDON_BASE_URL` to the deployed Vercel URL or your custom domain so the Stremio manifest logo URL is correct.

## BeamUp Deployment Notes

The BeamUp path remains unchanged:

```bash
yarn build
yarn start
```

`src/server.ts` starts Fastify on `process.env.PORT`, and `app.json` keeps the `/health` health check.

## Routes

### UI

```http
GET /
```

### Health Check

```http
GET /health
```

### Manifest

```http
GET /manifest.json
```

### Save Movie Link

```http
POST /api/link/movie
Content-Type: application/json
```

```json
{
  "imdbId": "tt10375396",
  "url": "https://example.com/movie-link"
}
```

### Save Series Episode Link

```http
POST /api/link/serie
Content-Type: application/json
```

```json
{
  "imdbId": "tt10375397",
  "season": 1,
  "episode": 2,
  "url": "https://example.com/serie-link"
}
```

### Delete Movie Link

```http
DELETE /api/link/movie/:imdbId
```

### Delete Series Episode Link

```http
DELETE /api/link/serie/:imdbId/:season/:episode
```

### Stremio Movie Stream

```http
GET /stream/movie/:imdbId.json
```

Example:

```http
GET /stream/movie/tt10375396.json
```

### Stremio Series Stream

```http
GET /stream/series/:id.json
```

Stremio sends series IDs in this format:

```txt
tt10375397:1:2
```

Example:

```http
GET /stream/series/tt10375397%3A1%3A2.json
```

Alternative route kept for compatibility:

```http
GET /stream/series/:imdbId/:season/:episode.json
```

## Database Structure

```json
{
  "link": {
    "movie": {
      "tt10375396": {
        "url": "https://example.com/movie-link",
        "createdAt": "2026-05-17T12:00:00.000Z",
        "updatedAt": "2026-05-17T12:00:00.000Z"
      }
    },
    "serie": {
      "tt10375397": {
        "1": {
          "2": {
            "url": "https://example.com/serie-link",
            "createdAt": "2026-05-17T12:00:00.000Z",
            "updatedAt": "2026-05-17T12:00:00.000Z"
          }
        }
      }
    }
  }
}
```

## Security

Firebase Admin SDK is used only on the backend. Do not expose Firebase service account values in frontend code.
