import type { FastifyInstance } from 'fastify'

import { Env } from '../config/env.js'

export async function ManifestRoute(App: FastifyInstance) {
  App.get('/manifest.json', async (_RequestObj, ReplyObj) => {
    return ReplyObj.send({
      id: Env.ADDON_ID,
      version: '1.0.0',
      name: Env.ADDON_NAME,
      description: Env.ADDON_DESCRIPTION,
      logo: `${Env.ADDON_BASE_URL}/public/logo.png`,
      resources: ['stream'],
      types: ['movie', 'series'],
      catalogs: [],
      idPrefixes: ['tt'],
    })
  })
}
