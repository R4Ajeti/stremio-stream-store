import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

import { SaveMovieLink, SaveSerieLink } from '../services/link.service.js'
import { trackRoute } from '../services/analytics.service.js'
import { MovieLinkSchema, SerieLinkSchema } from '../validators/link.validator.js'

function FormatError(ErrorObj: unknown): { error: string } {
  if (ErrorObj instanceof ZodError) {
    return {
      error: ErrorObj.errors[0]?.message || 'Invalid request',
    }
  }

  if (ErrorObj instanceof Error) {
    return {
      error: ErrorObj.message,
    }
  }

  return {
    error: 'Unexpected error',
  }
}

export async function LinkRoute(App: FastifyInstance) {
  App.post('/movie', async (RequestObj, ReplyObj) => {
    await trackRoute('/api/link/movie', RequestObj.method)
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
      return ReplyObj.status(ErrorObj instanceof ZodError ? 400 : 500).send(FormatError(ErrorObj))
    }
  })

  App.post('/serie', async (RequestObj, ReplyObj) => {
    await trackRoute('/api/link/serie', RequestObj.method)
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
      return ReplyObj.status(ErrorObj instanceof ZodError ? 400 : 500).send(FormatError(ErrorObj))
    }
  })
}
