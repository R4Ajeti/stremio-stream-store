import type { FastifyInstance, FastifyRequest } from 'fastify'

import { GetRouteAnalytics, trackRoute } from '../services/analytics.service.js'

function GetAuthorizationHeaderStr(RequestObj: FastifyRequest): string {
  const HeaderValue = RequestObj.headers.authorization

  if (Array.isArray(HeaderValue)) {
    return HeaderValue[0] || ''
  }

  return HeaderValue || ''
}

function GetQueryTokenStr(RequestObj: FastifyRequest): string {
  const QueryObj = RequestObj.query

  if (!QueryObj || typeof QueryObj !== 'object' || !('token' in QueryObj)) {
    return ''
  }

  const TokenValue = (QueryObj as { token?: unknown }).token
  return typeof TokenValue === 'string' ? TokenValue : ''
}

function IsAuthorized(RequestObj: FastifyRequest): boolean {
  const ReadTokenStr = process.env.ANALYTICS_READ_TOKEN

  if (!ReadTokenStr) {
    return true
  }

  return GetAuthorizationHeaderStr(RequestObj) === `Bearer ${ReadTokenStr}` || GetQueryTokenStr(RequestObj) === ReadTokenStr
}

export async function AnalyticsRoute(App: FastifyInstance) {
  App.get('/routes', async (RequestObj, ReplyObj) => {
    await trackRoute('/api/analytics/routes', RequestObj.method)

    if (!IsAuthorized(RequestObj)) {
      return ReplyObj.status(401).send({
        error: 'Unauthorized',
      })
    }

    return {
      routes: await GetRouteAnalytics(),
    }
  })
}
