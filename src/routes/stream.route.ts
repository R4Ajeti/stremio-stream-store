import type { FastifyInstance, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

import { GetMovieLink, GetSerieLink } from '../services/link.service.js'
import { trackRoute } from '../services/analytics.service.js'
import type { StremioStreamResponse } from '../types/link.type.js'
import { MovieStreamParamSchema, SeriesIdParamSchema, SeriesPathParamSchema } from '../validators/link.validator.js'

function SetNoStoreHeaders(ReplyObj: FastifyReply): void {
  ReplyObj.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  ReplyObj.header('Pragma', 'no-cache')
  ReplyObj.header('Expires', '0')
  ReplyObj.header('Surrogate-Control', 'no-store')
}

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
        url: UrlStr,
      },
    ],
  }
}

function ParseSeriesStremioId(IdStr: string): { imdbId: string; season: number; episode: number } {
  const DecodedIdStr = decodeURIComponent(IdStr)
  const [ImdbIdStr, SeasonStr, EpisodeStr] = DecodedIdStr.split(':')
  const ParsedObj = SeriesPathParamSchema.parse({
    imdbId: ImdbIdStr,
    season: SeasonStr,
    episode: EpisodeStr,
  })

  return ParsedObj
}

function ValidationErrorResponse(ErrorObj: ZodError): { streams: []; error: string } {
  return {
    streams: [],
    error: ErrorObj.errors[0]?.message || 'Invalid request',
  }
}

export async function StreamRoute(App: FastifyInstance) {
  App.get('/stream/movie/:imdbId.json', async (RequestObj, ReplyObj) => {
    trackRoute(RequestObj.raw.url || '/stream/movie/:imdbId.json', RequestObj.raw.method || 'GET')
    SetNoStoreHeaders(ReplyObj)

    try {
      const ParamsObj = MovieStreamParamSchema.parse(RequestObj.params)
      const LinkObj = await GetMovieLink(ParamsObj.imdbId)

      if (!LinkObj) {
        return EmptyStreamResponse()
      }

      return LinkToStreamResponse(LinkObj.url)
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send(ValidationErrorResponse(ErrorObj))
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })

  App.get('/stream/series/:id.json', async (RequestObj, ReplyObj) => {
    trackRoute(RequestObj.raw.url || '/stream/series/:id.json', RequestObj.raw.method || 'GET')
    SetNoStoreHeaders(ReplyObj)

    try {
      const ParamsObj = SeriesIdParamSchema.parse(RequestObj.params)
      const ParsedObj = ParseSeriesStremioId(ParamsObj.id)
      const LinkObj = await GetSerieLink(ParsedObj.imdbId, ParsedObj.season, ParsedObj.episode)

      if (!LinkObj) {
        return EmptyStreamResponse()
      }

      return LinkToStreamResponse(LinkObj.url)
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send(ValidationErrorResponse(ErrorObj))
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })

  App.get('/stream/series/:imdbId/:season/:episode.json', async (RequestObj, ReplyObj) => {
    trackRoute(RequestObj.raw.url || '/stream/series/:imdbId/:season/:episode.json', RequestObj.raw.method || 'GET')
    SetNoStoreHeaders(ReplyObj)

    try {
      const ParamsObj = SeriesPathParamSchema.parse(RequestObj.params)
      const LinkObj = await GetSerieLink(ParamsObj.imdbId, ParamsObj.season, ParamsObj.episode)

      if (!LinkObj) {
        return EmptyStreamResponse()
      }

      return LinkToStreamResponse(LinkObj.url)
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send(ValidationErrorResponse(ErrorObj))
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })
}
