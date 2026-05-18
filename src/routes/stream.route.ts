import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import type { StremioStreamResponse } from '../types/link.type.js'
import { GetMovieLink, GetSerieLink } from '../services/link.service.js'
import { GetValidationErrorMessage, IsValidationError } from '../utils/response.util.js'
import { ImdbIdParamSchema, ImdbIdRegex, SerieStreamParamSchema } from '../validators/link.validator.js'

interface SeriesStreamParams {
  imdbId: string
  season: number
  episode: number
}

const StremioIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Stremio ID is required'),
})

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

function SetNoCacheHeaders(ReplyObj: FastifyReply): void {
  ReplyObj.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  ReplyObj.header('Pragma', 'no-cache')
  ReplyObj.header('Expires', '0')
  ReplyObj.header('Surrogate-Control', 'no-store')
}

function ParseSeriesStremioId(IdStr: string): SeriesStreamParams {
  const [ImdbIdStr, SeasonStr, EpisodeStr] = decodeURIComponent(IdStr).split(':')
  const SeasonInt = Number(SeasonStr)
  const EpisodeInt = Number(EpisodeStr)

  if (!ImdbIdStr || !SeasonStr || !EpisodeStr) {
    throw new Error('Series stream ID must use format tt1234567:season:episode')
  }

  if (!ImdbIdRegex.test(ImdbIdStr)) {
    throw new Error('IMDb ID must look like tt1234567')
  }

  if (!Number.isInteger(SeasonInt) || SeasonInt <= 0) {
    throw new Error('Season must be a positive number')
  }

  if (!Number.isInteger(EpisodeInt) || EpisodeInt <= 0) {
    throw new Error('Episode must be a positive number')
  }

  return {
    imdbId: ImdbIdStr,
    season: SeasonInt,
    episode: EpisodeInt,
  }
}

async function BuildSeriesStreamResponse(ParamsObj: SeriesStreamParams): Promise<StremioStreamResponse> {
  const LinkObj = await GetSerieLink(ParamsObj.imdbId, ParamsObj.season, ParamsObj.episode)
  return LinkObj ? LinkToStreamResponse(LinkObj.url) : EmptyStreamResponse()
}

export async function StreamRoute(App: FastifyInstance) {
  App.get('/stream/movie/:imdbId.json', async (RequestObj, ReplyObj) => {
    SetNoCacheHeaders(ReplyObj)

    try {
      const ParamsObj = ImdbIdParamSchema.parse(RequestObj.params)
      const LinkObj = await GetMovieLink(ParamsObj.imdbId)

      return LinkObj ? LinkToStreamResponse(LinkObj.url) : EmptyStreamResponse()
    } catch (ErrorObj) {
      if (IsValidationError(ErrorObj)) {
        return ReplyObj.status(400).send({
          ...EmptyStreamResponse(),
          error: GetValidationErrorMessage(ErrorObj),
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })

  App.get('/stream/series/:id.json', async (RequestObj, ReplyObj) => {
    SetNoCacheHeaders(ReplyObj)

    try {
      const ParamsObj = StremioIdParamSchema.parse(RequestObj.params)
      return BuildSeriesStreamResponse(ParseSeriesStremioId(ParamsObj.id))
    } catch (ErrorObj) {
      if (IsValidationError(ErrorObj)) {
        return ReplyObj.status(400).send({
          ...EmptyStreamResponse(),
          error: GetValidationErrorMessage(ErrorObj),
        })
      }

      if (ErrorObj instanceof Error) {
        return ReplyObj.status(400).send({
          ...EmptyStreamResponse(),
          error: ErrorObj.message,
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })

  App.get('/stream/series/:imdbId/:season/:episode.json', async (RequestObj, ReplyObj) => {
    SetNoCacheHeaders(ReplyObj)

    try {
      const ParamsObj = SerieStreamParamSchema.parse(RequestObj.params)
      return BuildSeriesStreamResponse(ParamsObj)
    } catch (ErrorObj) {
      if (IsValidationError(ErrorObj)) {
        return ReplyObj.status(400).send({
          ...EmptyStreamResponse(),
          error: GetValidationErrorMessage(ErrorObj),
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send(EmptyStreamResponse())
    }
  })
}
