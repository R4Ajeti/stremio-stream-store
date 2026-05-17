# Stremio Stream Store

Save and serve custom Stremio stream links for movies and TV episodes using IMDb IDs.

## Overview

Stremio Stream Store is a simple Stremio addon that lets users save one custom stream link per movie or TV episode and return that link through Stremio-compatible stream routes.

It includes:

- A simple web UI for adding and updating links
- Firebase Realtime Database storage
- Movie links by IMDb ID
- TV episode links by IMDb ID, season, and episode
- Stremio addon manifest route
- Stremio stream routes
- TypeScript + Fastify backend

## Features

- Save one stream link per movie
- Save one stream link per TV episode
- Replace old links automatically when a new one is added
- Serve links to Stremio through addon stream endpoints
- Simple Firebase Realtime Database structure
- Clean and extendable TypeScript project structure

## Tech Stack

- TypeScript
- Node.js
- Fastify
- Firebase Realtime Database
- Firebase Admin SDK
- Stremio addon routes
- Beamup-ready deployment

## Database Structure

Firebase Realtime Database should use this structure:

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

## Firebase Paths

### Movie

```txt
link/movie/{imdbId}
```

Example:

```txt
link/movie/tt10375396
```

### Series Episode

```txt
link/serie/{imdbId}/{season}/{episode}
```

Example:

```txt
link/serie/tt10375397/1/2
```

## Expected Stremio Routes

### Manifest

```http
GET /manifest.json
```

Returns the Stremio addon manifest.

### Movie Stream

```http
GET /stream/movie/:imdbId.json
```

Example:

```http
GET /stream/movie/tt10375396.json
```

Returns:

```json
{
  "streams": [
    {
      "title": "Custom Stream",
      "externalUrl": "https://example.com/movie-link"
    }
  ]
}
```

If no link exists:

```json
{
  "streams": []
}
```

### Series Episode Stream

```http
GET /stream/series/:imdbId/:season/:episode.json
```

Example:

```http
GET /stream/series/tt10375397/1/2.json
```

Returns:

```json
{
  "streams": [
    {
      "title": "Custom Stream",
      "externalUrl": "https://example.com/serie-link"
    }
  ]
}
```

If no link exists:

```json
{
  "streams": []
}
```

## UI Requirements

The project should include a simple UI where users can add or update links.

### Movie Form

Fields:

- IMDb ID
- URL

Example:

```txt
IMDb ID: tt10375396
URL: https://example.com/movie-link
```

### Series Episode Form

Fields:

- IMDb ID
- Season
- Episode
- URL

Example:

```txt
IMDb ID: tt10375397
Season: 1
Episode: 2
URL: https://example.com/serie-link
```

## API Requirements

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

Behavior:

- If the movie does not exist, create it.
- If the movie already exists, replace the old URL.
- Preserve `createdAt`.
- Update `updatedAt`.

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

Behavior:

- If the episode does not exist, create it.
- If the episode already exists, replace the old URL.
- Preserve `createdAt`.
- Update `updatedAt`.

## Validation Rules

### IMDb ID

IMDb ID is required and should follow this format:

```txt
tt1234567
```

### URL

URL is required and should be a valid `http` or `https` URL.

### Season

Season is required for series episodes and must be a positive number.

### Episode

Episode is required for series episodes and must be a positive number.

## Environment Variables

Create a `.env` file:

```env
PORT=3000

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com

ADDON_BASE_URL=http://localhost:3000
```

For production, `ADDON_BASE_URL` should be your deployed addon URL.

Example:

```env
ADDON_BASE_URL=https://your-addon-url.example.com
```

## Installation

```bash
yarn install
```

## Development

```bash
yarn dev
```

The addon should run locally at:

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

## Suggested Project Structure

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

## Deployment

This project is intended to be deployable on Beamup.

The server must listen on `process.env.PORT`:

```ts
const port = Number(process.env.PORT || 3000)

await app.listen({
  port,
  host: '0.0.0.0',
})
```

## Beamup Deployment Notes

Before deploying, make sure all Firebase environment variables are configured in Beamup.

Required variables:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_DATABASE_URL
ADDON_BASE_URL
```

Then deploy the app using Beamup.

## Security Notes

The Firebase Admin SDK should only be used on the backend.

Do not expose Firebase service account credentials in the frontend.

The UI should call the backend API, and the backend should write to Firebase Realtime Database.

## Future Improvements

- Add admin authentication
- Add delete link functionality
- Add list/search saved links
- Add support for multiple links per movie or episode
- Add custom stream titles
- Add link health checking
- Add import/export functionality
- Add user-specific private link collections

## License

MIT
