import path from 'node:path'

import Cors from '@fastify/cors'
import FormBody from '@fastify/formbody'
import Static from '@fastify/static'
import Fastify from 'fastify'

import { Env } from './config/env.js'
import { LinkRoute } from './routes/link.route.js'
import { ManifestRoute } from './routes/manifest.route.js'
import { StreamRoute } from './routes/stream.route.js'
import { UiRoute } from './routes/ui.route.js'

export async function BuildApp() {
  const App = Fastify({
    logger: true,
  })

  await App.register(Cors, {
    origin: true,
  })

  await App.register(FormBody)

  await App.register(Static, {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public/',
  })

  App.get('/favicon.ico', async (_RequestObj, ReplyObj) => ReplyObj
    .type('image/png')
    .sendFile('logo.png'))

  App.get('/health', async () => ({
    ok: true,
    name: Env.ADDON_NAME,
    time: new Date().toISOString(),
  }))

  await App.register(UiRoute)
  await App.register(ManifestRoute)
  await App.register(StreamRoute)
  await App.register(LinkRoute, {
    prefix: '/api/link',
  })

  return App
}