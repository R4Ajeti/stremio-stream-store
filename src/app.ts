import path from 'node:path'

import Cors from '@fastify/cors'
import FormBody from '@fastify/formbody'
import RateLimit from '@fastify/rate-limit'
import Static from '@fastify/static'
import Fastify from 'fastify'

import { Env } from './config/env.js'
import { RouteTrackingPlugin } from './plugins/route-tracking.plugin.js'
import { AnalyticsRoute } from './routes/analytics.route.js'
import { LinkRoute } from './routes/link.route.js'
import { ManifestRoute } from './routes/manifest.route.js'
import { StreamRoute } from './routes/stream.route.js'
import { UiRoute } from './routes/ui.route.js'
import { ApiError } from './utils/api-response.util.js'

export async function BuildApp() {
  const App = Fastify({
    logger: true,
  })

  await App.register(Cors, {
    origin: true,
  })

  await App.register(FormBody)

  await App.register(RateLimit, {
    max: 300,
    timeWindow: '1 minute',
    skipOnError: true,
    errorResponseBuilder: (_RequestObj, ContextObj) => ApiError(
      'RATE_LIMITED',
      `Rate limit exceeded. Try again in ${ContextObj.after}.`,
    ),
  })

  await App.register(Static, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  })

  await App.register(RouteTrackingPlugin)

  App.get('/favicon.ico', async (RequestObj, ReplyObj) => {
    return ReplyObj
      .type('image/png')
      .sendFile('logo.png')
  })

  App.get('/health', async (RequestObj) => {
    return {
      ok: true,
      name: Env.ADDON_NAME,
      time: new Date().toISOString(),
    }
  })

  await App.register(UiRoute)
  await App.register(ManifestRoute)
  await App.register(StreamRoute)
  await App.register(AnalyticsRoute, {
    prefix: '/api/analytics',
  })
  await App.register(LinkRoute, {
    prefix: '/api/link',
  })

  return App
}
