import type { FastifyInstance } from 'fastify'
import { trackRoute } from '../services/analytics.service.js'

export async function UiRoute(App: FastifyInstance) {
  App.get('/', async (RequestObj, ReplyObj) => {
    // track redirect
    await trackRoute('/', RequestObj.method)
    return ReplyObj.redirect('/set')
  })

  App.get('/set', async (RequestObj, ReplyObj) => {
    await trackRoute('/set', RequestObj.method)
    const AnalyticsScriptStr = process.env.VERCEL ? '<script defer src="/_vercel/insights/script.js"></script>' : ''

    return ReplyObj.type('text/html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stremio Stream Store</title>
  <link rel="icon" type="image/png" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/public/logo.png" />
  <link rel="stylesheet" href="/public/styles.css" />
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="logo">▶</div>
      <div>
        <h1>Stremio Stream Store</h1>
        <p>Save one custom playable stream link per movie or TV episode using IMDb IDs.</p>
      </div>
    </section>

    <section class="card install-card">
      <h2>Install Addon</h2>
      <p>Use this manifest URL in Stremio:</p>
      <code id="manifestUrl"></code>
    </section>

    <section class="grid">
      <form class="card" id="movieForm">
        <h2>Save Movie Link</h2>

        <label>
          IMDb ID
          <input name="imdbId" required placeholder="tt1234567" autocomplete="off" />
        </label>

        <label>
          Stream URL
          <input name="url" required placeholder="https://example.com/movie.mp4" autocomplete="off" />
        </label>

        <button type="submit">Save Movie</button>
        <pre id="movieResult"></pre>
      </form>

      <form class="card" id="serieForm">
        <h2>Save Series Episode Link</h2>

        <label>
          IMDb ID
          <input name="imdbId" required placeholder="tt1234567" autocomplete="off" />
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
          <input name="url" required placeholder="https://example.com/episode.mp4" autocomplete="off" />
        </label>

        <button type="submit">Save Episode</button>
        <pre id="serieResult"></pre>
      </form>
    </section>
  </main>

  ${AnalyticsScriptStr}
  <script src="/public/main.js"></script>
</body>
</html>`)
  })

  App.get('/ui/analytics/routes', async (_RequestObj, ReplyObj) => {
    return ReplyObj.type('text/html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Route Analytics | Stremio Stream Store</title>
  <link rel="icon" type="image/png" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/public/logo.png" />
  <link rel="stylesheet" href="/public/analytics.css" />
</head>
<body>
  <main class="dashboard-shell">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">Stremio Stream Store</p>
        <h1>Route Analytics</h1>
      </div>

      <form class="toolbar" id="tokenForm">
        <label class="token-field">
          <span>Access token</span>
          <input id="tokenInput" type="password" autocomplete="off" placeholder="Optional" />
        </label>
        <button type="submit">Apply</button>
        <button type="button" id="refreshButton">Refresh</button>
      </form>
    </header>

    <section class="summary-grid" aria-label="Route analytics summary">
      <article class="metric-panel">
        <span>Total hits</span>
        <strong id="totalHits">0</strong>
      </article>
      <article class="metric-panel">
        <span>Today</span>
        <strong id="todayHits">0</strong>
      </article>
      <article class="metric-panel">
        <span>Last 7 days</span>
        <strong id="recentHits">0</strong>
      </article>
      <article class="metric-panel">
        <span>Tracked routes</span>
        <strong id="trackedRoutes">0</strong>
      </article>
    </section>

    <section class="status-strip">
      <span id="statusText">Loading analytics...</span>
      <span id="lastUpdatedText"></span>
    </section>

    <section class="chart-grid">
      <article class="panel panel-large">
        <div class="panel-heading">
          <h2>Top 5 Routes</h2>
          <span>Total hits</span>
        </div>
        <div class="bar-chart" id="topRoutesChart"></div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <h2>Today</h2>
          <span id="todayLabel"></span>
        </div>
        <div class="bar-chart compact" id="todayRoutesChart"></div>
      </article>

      <article class="panel panel-full">
        <div class="panel-heading">
          <h2>Daily Trend</h2>
          <span id="trendLabel"></span>
        </div>
        <div class="trend-chart" id="trendChart"></div>
      </article>
    </section>

    <section class="panel routes-panel">
      <div class="panel-heading">
        <h2>All Routes</h2>
        <span>Sorted by total hits</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Route</th>
              <th>Method</th>
              <th>Total</th>
              <th>Today</th>
              <th>Last 7</th>
              <th>Last hit</th>
            </tr>
          </thead>
          <tbody id="routesTableBody"></tbody>
        </table>
      </div>
    </section>
  </main>

  <script src="/public/analytics.js"></script>
</body>
</html>`)
  })
}
