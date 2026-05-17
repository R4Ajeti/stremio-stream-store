import type { FastifyInstance } from 'fastify'

export async function UiRoute(App: FastifyInstance) {
  App.get('/', async (_RequestObj, ReplyObj) => {
    return ReplyObj.type('text/html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Stremio Stream Store</title>
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="logo">▶</div>
      <div>
        <h1>Stremio Stream Store</h1>
        <p>Save one custom stream link per movie or TV episode using IMDb IDs.</p>
      </div>
    </section>

    <section class="card">
      <h2>Install Addon</h2>
      <p>Use this manifest URL in Stremio:</p>
      <code id="manifestUrl"></code>
    </section>

    <section class="grid">
      <form class="card" id="movieForm">
        <h2>Save Movie Link</h2>

        <label>
          Admin Token
          <input name="adminToken" type="password" placeholder="Optional if ADMIN_TOKEN is not configured" />
        </label>

        <label>
          IMDb ID
          <input name="imdbId" required placeholder="tt10375396" />
        </label>

        <label>
          Stream URL
          <input name="url" required placeholder="https://example.com/movie-link" />
        </label>

        <button type="submit">Save Movie</button>
        <pre id="movieResult"></pre>
      </form>

      <form class="card" id="serieForm">
        <h2>Save Series Episode Link</h2>

        <label>
          Admin Token
          <input name="adminToken" type="password" placeholder="Optional if ADMIN_TOKEN is not configured" />
        </label>

        <label>
          IMDb ID
          <input name="imdbId" required placeholder="tt10375397" />
        </label>

        <div class="row">
          <label>
            Season
            <input name="season" required type="number" min="1" placeholder="1" />
          </label>

          <label>
            Episode
            <input name="episode" required type="number" min="1" placeholder="2" />
          </label>
        </div>

        <label>
          Stream URL
          <input name="url" required placeholder="https://example.com/serie-link" />
        </label>

        <button type="submit">Save Episode</button>
        <pre id="serieResult"></pre>
      </form>
    </section>
  </main>

  <script src="/public/main.js"></script>
</body>
</html>`)
  })
}
