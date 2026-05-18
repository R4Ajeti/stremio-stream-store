# Stremio Stream Store

Save and serve custom Stremio stream links for movies and TV episodes using IMDb IDs.

## Features

- Simple UI for saving movie and TV episode links
- Firebase Realtime Database storage
- One active custom stream link per movie
- One active custom stream link per TV episode
- Automatic overwrite when the same movie or episode is saved again
- Stremio-compatible manifest and stream routes
- TypeScript + Fastify backend
- Beamup-ready deployment

## Project Structure

```txt
stremio-stream-store/
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── routes/
│   │   ├── manifest.route.ts
│   │   ├── stream.route.ts
│   │   ├── link.route.ts
│   │   └── ui.route.ts
│   ├── services/
│   │   ├── firebase.service.ts
│   │   └── link.service.ts
│   ├── validators/
│   │   └── link.validator.ts
│   ├── types/
│   │   └── link.type.ts
│   └── utils/
│       └── date.util.ts
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
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
```

Body:

```json
{
  "imdbId": "tt10375396",
  "url": "https://example.com/movie-link"
}
```

Optional header when `ADMIN_TOKEN` is set:

```http
Authorization: Bearer change-this-token
```

### Save Series Episode Link

```http
POST /api/link/serie
```

Body:

```json
{
  "imdbId": "tt10375397",
  "season": 1,
  "episode": 2,
  "url": "https://example.com/serie-link"
}
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

## Setup

```bash
yarn install
cp .env.example .env
```

Fill Firebase values in `.env`.

## Development

```bash
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

## Build

```bash
yarn build
```

## Start

```bash
yarn start
```

## Beamup Notes

The app listens on `process.env.PORT`, so it is ready for Beamup-style deployment.

Set all required environment variables on your host:

```txt
ADDON_BASE_URL
ADMIN_TOKEN
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY_BASE64
FIREBASE_DATABASE_URL
```

## Security

The UI sends requests to your backend. Firebase Admin SDK is used only on the backend.

If `ADMIN_TOKEN` is configured, save/update API calls require:

```http
Authorization: Bearer YOUR_ADMIN_TOKEN
```

or the UI token field.

## License

MIT


## Supported Environment Variables

This project supports only these environment variables:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY_BASE64=
FIREBASE_DATABASE_URL=
ADDON_BASE_URL=
PORT=
```

### Generate `FIREBASE_PRIVATE_KEY_BASE64`

From your Firebase service account JSON file:

```bash
node -e "const key=require('./service-account.json').private_key; console.log(Buffer.from(key, 'utf8').toString('base64'))"
```

Then set it on Beamup:

```bash
beamup secrets FIREBASE_PRIVATE_KEY_BASE64 "PASTE_BASE64_VALUE_HERE"
```

Do not set `FIREBASE_PRIVATE_KEY` or `FIREBASE_SERVICE_ACCOUNT_BASE64`; they are not used by this project.


## Vercel Deployment

This project includes a Vercel serverless entrypoint:

```txt
api/index.ts
```

and a rewrite config:

```txt
vercel.json
```

Vercel routes all requests to the Fastify app, so these URLs work:

```txt
/
/manifest.json
/stream/movie/:imdbId.json
/stream/series/:id.json
```

Set these environment variables in Vercel:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY_BASE64=
FIREBASE_DATABASE_URL=
ADDON_BASE_URL=https://your-vercel-domain.vercel.app
PORT=3000
```

`PORT` is mostly used for local/Beamup. Vercel does not use a long-running port listener.


## Vercel Runtime Logs

If Vercel shows:

```txt
500: INTERNAL_SERVER_ERROR
FUNCTION_INVOCATION_FAILED
```

the build succeeded but the serverless function crashed at runtime.

Check runtime logs in:

```txt
Vercel Dashboard → Project → Deployments → latest deployment → Functions → api/index → Logs
```

or:

```bash
vercel logs https://your-deployment-url.vercel.app
```

Make sure all production environment variables are set in Vercel:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY_BASE64=
FIREBASE_DATABASE_URL=
ADDON_BASE_URL=https://your-vercel-domain.vercel.app
PORT=3000
```


## Final Vercel Fix

Do not use `@fastify/aws-lambda` on Vercel for this project.

The Vercel entrypoint is:

```txt
api/index.ts
```

It uses native Node request/response objects and forwards them into Fastify:

```ts
App.server.emit('request', RequestObj, ReplyObj)
```

`vercel.json` rewrites all routes to `/api/index`.

If Vercel still shows `@fastify/aws-lambda` in logs, your deployed commit still has the old dependency/import. Remove `node_modules`, regenerate `yarn.lock`, commit, and redeploy without cache.
