import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

import { GetMovieLink, GetSerieLink } from '../services/link.service.js'
import { ImdbIdParamSchema, SerieStreamParamSchema } from '../validators/link.validator.js'
import type { StremioStreamResponse } from '../types/link.type.js'

function EmptyStreamResponse(): StremioStreamResponse {
  return {
    streams: [],
  }
}

function LinkToStreamResponse(UrlStr: string): StremioStreamResponse {
  return {
    streams: [
      {
        title: 'Custom Stream',
        externalUrl: UrlStr,
      },
    ],
  }
}

export async function StreamRoute(App: FastifyInstance) {
  App.get('/stream/movie/:imdbId.json', async (RequestObj, ReplyObj) => {
    try {
      const ParamsObj = ImdbIdParamSchema.parse(RequestObj.params)
      const LinkObj = await GetMovieLink(ParamsObj.imdbId)

      if (!LinkObj) {
        return EmptyStreamResponse()
      }

      return LinkToStreamResponse(LinkObj.url)
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          streams: [],
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })

  App.get('/stream/series/:imdbId/:season/:episode.json', async (RequestObj, ReplyObj) => {
    try {
      const ParamsObj = SerieStreamParamSchema.parse(RequestObj.params)
      const LinkObj = await GetSerieLink(ParamsObj.imdbId, ParamsObj.season, ParamsObj.episode)

      if (!LinkObj) {
        return EmptyStreamResponse()
      }

      return LinkToStreamResponse(LinkObj.url)
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          streams: [],
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })
}
