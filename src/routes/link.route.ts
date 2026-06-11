import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

import { Env } from '../config/env.js'
import { SaveMovieLink, SaveSerieLink } from '../services/link.service.js'
import { ApiError, FormatApiError } from '../utils/api-response.util.js'
import { IsRequestAuthorized } from '../utils/auth.util.js'
import { MovieLinkSchema, SerieLinkSchema } from '../validators/link.validator.js'

export async function LinkRoute(App: FastifyInstance) {
  App.post('/movie', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (RequestObj, ReplyObj) => {
    if (!IsRequestAuthorized(RequestObj, Env.LINK_WRITE_TOKEN)) {
      return ReplyObj.status(401).send(ApiError('UNAUTHORIZED', 'A valid write token is required to save links'))
    }

    try {
      const BodyObj = MovieLinkSchema.parse(RequestObj.body)
      const ResultObj = await SaveMovieLink(BodyObj)

      return ReplyObj.send({
        ok: true,
        type: 'movie',
        ...ResultObj,
      })
    } catch (ErrorObj) {
      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(ErrorObj instanceof ZodError ? 400 : 500).send(FormatApiError(ErrorObj))
    }
  })

  App.post('/serie', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (RequestObj, ReplyObj) => {
    if (!IsRequestAuthorized(RequestObj, Env.LINK_WRITE_TOKEN)) {
      return ReplyObj.status(401).send(ApiError('UNAUTHORIZED', 'A valid write token is required to save links'))
    }

    try {
      const BodyObj = SerieLinkSchema.parse(RequestObj.body)
      const ResultObj = await SaveSerieLink(BodyObj)

      return ReplyObj.send({
        ok: true,
        type: 'serie',
        ...ResultObj,
      })
    } catch (ErrorObj) {
      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(ErrorObj instanceof ZodError ? 400 : 500).send(FormatApiError(ErrorObj))
    }
  })
}
