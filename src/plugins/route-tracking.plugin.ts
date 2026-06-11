import type { FastifyPluginAsync } from 'fastify'

import { trackRoute } from '../services/analytics.service.js'

function NormalizeRequestPathStr(UrlStr: string): string {
  const [PathStr] = UrlStr.split('?')
  return PathStr || '/'
}

function GetTrackedRouteStr(UrlStr: string): string | null {
  const PathStr = NormalizeRequestPathStr(UrlStr)

  if ([
    '/',
    '/set',
    '/ui/analytics/routes',
    '/health',
    '/favicon.ico',
    '/manifest.json',
    '/api/analytics/routes',
    '/api/link/movie',
    '/api/link/serie',
  ].includes(PathStr)) {
    return PathStr
  }

  if (/^\/stream\/movie\/[^/]+\.json$/.test(PathStr)) {
    return '/stream/movie/:imdbId.json'
  }

  if (/^\/stream\/series\/[^/]+\.json$/.test(PathStr)) {
    return '/stream/series/:id.json'
  }

  if (/^\/stream\/series\/[^/]+\/[^/]+\/[^/]+\.json$/.test(PathStr)) {
    return '/stream/series/:imdbId/:season/:episode.json'
  }

  return null
}

export const RouteTrackingPlugin: FastifyPluginAsync = async (App) => {
  App.addHook('onResponse', async (RequestObj) => {
    const RouteStr = GetTrackedRouteStr(RequestObj.url)

    if (!RouteStr) {
      return
    }

    await trackRoute(RouteStr, {
      method: RequestObj.method,
      headers: RequestObj.headers,
      ip: RequestObj.ip,
    })
  })
}
