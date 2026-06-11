import type { FastifyInstance } from 'fastify'

import { Env } from '../config/env.js'
import { GetRouteAnalytics } from '../services/analytics.service.js'
import { ApiError } from '../utils/api-response.util.js'
import { IsRequestAuthorized } from '../utils/auth.util.js'

export async function AnalyticsRoute(App: FastifyInstance) {
  App.get('/routes', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (RequestObj, ReplyObj) => {
    if (!IsRequestAuthorized(RequestObj, Env.ANALYTICS_READ_TOKEN, { allowQueryToken: true })) {
      return ReplyObj.status(401).send(ApiError('UNAUTHORIZED', 'A valid analytics token is required'))
    }

    return GetRouteAnalytics()
  })
}
