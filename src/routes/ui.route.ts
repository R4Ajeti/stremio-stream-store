import type { FastifyInstance } from 'fastify'

import { Env } from '../config/env.js'

export async function UiRoute(App: FastifyInstance) {
  App.get('/', async (_RequestObj, ReplyObj) => {
    return ReplyObj.redirect('/set')
  })

  App.get('/set', async (_RequestObj, ReplyObj) => {
    const AnalyticsScriptStr = Env.IS_VERCEL ? '<script defer src="/_vercel/insights/script.js"></script>' : ''

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

    <section class="install-row">
      <section class="card install-card">
        <h2>Install Addon</h2>
        <p>Use this manifest URL in Stremio:</p>
        <code id="manifestUrl"></code>
        <div class="action-row">
          <button type="button" class="secondary-button" id="copyManifestButton">Copy URL</button>
          <a class="install-button" id="installButton" href="/manifest.json">Open in Stremio</a>
        </div>
        <p class="inline-status" id="manifestStatus" aria-live="polite"></p>
      </section>

      <section class="card admin-card">
        <h2>Admin Access</h2>
        <label>
          Write token
          <input id="writeTokenInput" type="password" autocomplete="off" placeholder="Only required when configured" />
        </label>
        <label class="checkbox-label">
          <input id="rememberWriteTokenInput" type="checkbox" />
          <span>Remember on this device</span>
        </label>
      </section>

      <section class="card support-card">
        <p>Stremio Stream Store is free and open source. If it helps you, you can support hosting, maintenance, and future development on Ko-fi.</p>
        <div class="support-actions">
          <a class="support-button" href="https://ko-fi.com/r4ajeti" target="_blank" rel="noopener noreferrer">
            <span class="support-icon" aria-hidden="true">
              <img class="support-icon-img" src="/public/ko-fi-coffie-image.webp" alt="" />
            </span>
            <span>Support</span>
          </a>
        </div>
      </section>
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
        <p class="result-message" id="movieMessage" aria-live="polite"></p>
        <details class="result-details">
          <summary>Response details</summary>
          <pre id="movieResult"></pre>
        </details>
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
        <p class="result-message" id="serieMessage" aria-live="polite"></p>
        <details class="result-details">
          <summary>Response details</summary>
          <pre id="serieResult"></pre>
        </details>
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

    <section class="panel support-panel">
      <p>Running this addon requires hosting, monitoring, and maintenance. Support the project if you want to help keep it online and improving.</p>
      <a class="support-link" href="https://ko-fi.com/r4ajeti" target="_blank" rel="noopener noreferrer">
        <span class="support-icon" aria-hidden="true">
          <img class="support-icon-img" src="/public/ko-fi-coffie-image.webp" alt="" />
        </span>
        <span>Support on Ko-fi</span>
      </a>
    </section>

    <section class="summary-grid" aria-label="Route analytics summary">
      <article class="metric-panel metric-split">
        <span>Total hits</span>
        <div class="metric-row">
          <strong id="totalHits">0</strong>
          <div class="metric-delta positive">
            <span>Today</span>
            <strong id="totalHitsDelta">+0</strong>
          </div>
        </div>
      </article>
      <article class="metric-panel metric-split">
        <span>Unique visitors</span>
        <div class="metric-row">
          <strong id="uniqueVisitors">0</strong>
          <div class="metric-delta positive">
            <span>Today</span>
            <strong id="uniqueVisitorsDelta">+0</strong>
          </div>
        </div>
      </article>
      <article class="metric-panel metric-split">
        <span>Last 7 days</span>
        <div class="metric-row">
          <strong id="recentHits">0</strong>
          <div class="metric-delta neutral" id="recentHitsDeltaWrap">
            <span>Vs prev 7 days</span>
            <strong id="recentHitsDelta">0</strong>
          </div>
        </div>
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

    <section class="audience-grid">
      <article class="panel audience-panel">
        <div class="panel-heading">
          <h2>Countries</h2>
          <span>Unique visitors</span>
        </div>
        <div id="countriesPanel"></div>
      </article>

      <article class="panel audience-panel">
        <div class="panel-heading">
          <h2>Devices</h2>
          <span>Unique visitors</span>
        </div>
        <div id="devicesPanel"></div>
      </article>

      <article class="panel audience-panel">
        <div class="panel-heading">
          <h2>Browsers</h2>
          <span>Unique visitors</span>
        </div>
        <div id="browsersPanel"></div>
      </article>

      <article class="panel audience-panel">
        <div class="panel-heading">
          <h2>Operating Systems</h2>
          <span>Unique visitors</span>
        </div>
        <div id="operatingSystemsPanel"></div>
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
