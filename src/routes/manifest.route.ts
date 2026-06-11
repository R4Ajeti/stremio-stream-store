import type { FastifyInstance } from 'fastify'

import { Env } from '../config/env.js'

export async function ManifestRoute(App: FastifyInstance) {
  App.get('/manifest.json', async (RequestObj, ReplyObj) => {
    return ReplyObj.send({
      id: Env.ADDON_ID,
      version: Env.ADDON_VERSION,
      name: Env.ADDON_NAME,
      description: Env.ADDON_DESCRIPTION,
      logo: `${Env.ADDON_BASE_URL}/public/logo.png`,
      resources: ['stream'],
      types: ['movie', 'series'],
      catalogs: [],
      idPrefixes: ['tt'],
      behaviorHints: {
        configurable: true,
        configurationRequired: false,
      },
      stremioAddonsConfig: {
        "issuer": "https://stremio-addons.net",
        "signature": "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..nEMpa0hsZuOu6pttBbktMA.XQLFRnZlfSBaioKRgUpogLIfPSwDv7olyKxR-RrHXtKE76ZwFewSEIU2ZMDH_g9EPXmFAW3u-stzc3GDg3PDKz9otJBQ036hWFdH-eH3ONIVuYbG3NB_WOssqbMjoqCD.Z_HIcH3l7R2HO_m3P9drOg"
      }
    })
  })
}
