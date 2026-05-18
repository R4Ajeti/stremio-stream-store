import type { FastifyInstance } from 'fastify'

import { Env } from '../config/env.js'

export async function ManifestRoute(App: FastifyInstance) {
  App.get('/manifest.json', async (RequestObj) => {
    const HostStr = RequestObj.headers.host
    const ForwardedProtoStr = RequestObj.headers['x-forwarded-proto']

    const ProtocolStr = typeof ForwardedProtoStr === 'string'
      ? ForwardedProtoStr.split(',')[0]
      : 'https'

    const BaseUrlStr = HostStr
      ? `${ProtocolStr}://${HostStr}`
      : Env.ADDON_BASE_URL

    return {
      id: Env.ADDON_ID,
      version: '1.0.0',
      name: Env.ADDON_NAME,
      description: Env.ADDON_DESCRIPTION,
      logo: `${BaseUrlStr}/public/logo.png`,
      resources: ['stream'],
      types: ['movie', 'series'],
      catalogs: [],
      idPrefixes: ['tt'],
    }
  })
}