# Stremio Stream Store

A TypeScript/Fastify Stremio addon that lets you save and serve one custom playable stream link per movie or TV episode using IMDb IDs.

## What it does

- Provides a simple web UI at `/`
- Saves movie links by IMDb ID
- Saves TV episode links by IMDb ID, season, and episode
- Stores data in Firebase Realtime Database
- Overwrites the existing saved link when the same movie or episode is submitted again
- Preserves `createdAt` and updates `updatedAt`
- Exposes Stremio-compatible manifest and stream routes
- Returns stream links with `url`, not `externalUrl`, so Stremio can play them instead of opening the browser
- Keeps manifest cacheable, but disables cache only for stream routes
- Works locally as a normal Fastify server and on Vercel as a serverless app

## Stack

- TypeScript
- Node.js
- Fastify
- Firebase Realtime Database
- Simple HTML/CSS/JavaScript UI
- Vercel serverless entrypoint

## Project structure

```txt
stremio-stream-store/
├── api/
│   └── index.ts
├── public/
│   ├── logo.png
│   ├── main.js
│   └── styles.css
├── src/
│   ├── app.ts
│   ├── server.ts
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
│   │   └── date.util.ts
│   └── validators/
│       └── link.validator.ts
├── app.json
├── package.json
├── tsconfig.json
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## Firebase database structure

```json
{
  "link": {
    "movie": {
      "tt1234567": {
        "url": "https://example.com/movie.mp4",
        "createdAt": "2026-05-18T12:00:00.000Z",
        "updatedAt": "2026-05-18T12:10:00.000Z"
      }
    },
    "serie": {
      "tt1234567": {
        "1": {
          "2": {
            "url": "https://example.com/episode.mp4",
            "createdAt": "2026-05-18T12:00:00.000Z",
            "updatedAt": "2026-05-18T12:10:00.000Z"
          }
        }
      }
    }
  }
}
```

## Environment variables

Only these envs are supported:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY_BASE64
FIREBASE_DATABASE_URL
ADDON_BASE_URL
PORT
ANALYTICS_READ_TOKEN
```

`ANALYTICS_READ_TOKEN` is optional. When set, `GET /api/analytics/routes` requires either
`Authorization: Bearer <token>` or `?token=<token>`.

Copy the example file:

```bash
cp .env.example .env
```

### Encode Firebase private key

Use the PEM private key from your Firebase service account JSON and encode it as base64.

```bash
printf '%s' '-----BEGIN PRIVATE KEY-----
YOUR_KEY_HERE
-----END PRIVATE KEY-----
' | base64
```

Then paste the output into:

```txt
FIREBASE_PRIVATE_KEY_BASE64=...
```

Raw `FIREBASE_PRIVATE_KEY` is intentionally not supported.

## Local development

```bash
yarn install
yarn dev
```

Open:

```txt
http://localhost:3000
```

Manifest URL:

```txt
http://localhost:3000/manifest.json
```

## Build and run

```bash
yarn build
yarn start
```

The local server listens on:

```ts
process.env.PORT
0.0.0.0
```

## Vercel deployment

This project includes:

- `api/index.ts` as the Vercel serverless entrypoint
- `vercel.json` to rewrite every route to the Fastify handler
- `public/` static assets

Set these environment variables in Vercel:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY_BASE64
FIREBASE_DATABASE_URL
ADDON_BASE_URL=https://your-vercel-domain.vercel.app
PORT=3000
ANALYTICS_READ_TOKEN=optional-secret-for-route-stats
```

`PORT` is mainly used for local/server hosting. Vercel handles the actual serverless runtime port internally.

## Routes

### UI

```http
GET /
```

### Health

```http
GET /health
```

### Route analytics

```http
GET /api/analytics/routes
```

Returns route hit counts from Firebase:

```json
{
  "routes": [
    {
      "route": "/stream/movie/:imdbId.json",
      "method": "GET",
      "hits": 12,
      "firstHitAt": "2026-05-24T10:00:00.000Z",
      "lastHitAt": "2026-05-24T10:30:00.000Z"
    }
  ]
}
```

### Manifest

```http
GET /manifest.json
```

The manifest logo is generated as:

```ts
`${Env.ADDON_BASE_URL}/public/logo.png`
```

Manifest cache is not disabled.

### Save movie link

```http
POST /api/link/movie
Content-Type: application/json

{
  "imdbId": "tt1234567",
  "url": "https://example.com/movie.mp4"
}
```

Stored at:

```txt
link/movie/{imdbId}
```

### Save series episode link

```http
POST /api/link/serie
Content-Type: application/json

{
  "imdbId": "tt1234567",
  "season": 1,
  "episode": 2,
  "url": "https://example.com/episode.mp4"
}
```

Stored at:

```txt
link/serie/{imdbId}/{season}/{episode}
```

### Movie stream

```http
GET /stream/movie/:imdbId.json
```

Example:

```http
GET /stream/movie/tt1234567.json
```

### Series stream, Stremio format

```http
GET /stream/series/:id.json
```

Where `id` is:

```txt
ttid:season:episode
```

Example:

```http
GET /stream/series/tt1234567:1:2.json
```

### Series stream, path format

```http
GET /stream/series/:imdbId/:season/:episode.json
```

Example:

```http
GET /stream/series/tt1234567/1/2.json
```

## Stream response format

When a saved link exists:

```json
{
  "streams": [
    {
      "title": "Custom Stream",
      "url": "https://example.com/movie.mp4"
    }
  ]
}
```

When no link exists:

```json
{
  "streams": []
}
```

## Stream cache behavior

Only stream routes send no-cache headers:

```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
Surrogate-Control: no-store
```

## Useful curl tests

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/analytics/routes
curl http://localhost:3000/manifest.json

curl -X POST http://localhost:3000/api/link/movie \
  -H 'Content-Type: application/json' \
  -d '{"imdbId":"tt1234567","url":"https://example.com/movie.mp4"}'

curl http://localhost:3000/stream/movie/tt1234567.json

curl -X POST http://localhost:3000/api/link/serie \
  -H 'Content-Type: application/json' \
  -d '{"imdbId":"tt1234567","season":1,"episode":2,"url":"https://example.com/episode.mp4"}'

curl http://localhost:3000/stream/series/tt1234567:1:2.json
curl http://localhost:3000/stream/series/tt1234567/1/2.json
```
