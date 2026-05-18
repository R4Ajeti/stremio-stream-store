import type { FastifyInstance } from 'fastify'
import { ZodError, z } from 'zod'

import { GetMovieLink, GetSerieLink } from '../services/link.service.js'
import { ImdbIdParamSchema } from '../validators/link.validator.js'
import type { StremioStreamResponse } from '../types/link.type.js'

function SetNoCacheHeaders(ReplyObj: { header: (NameStr: string, ValueStr: string) => unknown }): void {
  ReplyObj.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  ReplyObj.header('Pragma', 'no-cache')
  ReplyObj.header('Expires', '0')
  ReplyObj.header('Surrogate-Control', 'no-store')
}


const StremioIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Stremio ID is required'),
})

const ImdbIdRegex = /^tt\d{7,10}$/

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

function ParseSeriesStremioId(IdStr: string): {
  imdbId: string
  season: number
  episode: number
} {
  const DecodedIdStr = decodeURIComponent(IdStr)
  const PartList = DecodedIdStr.split(':')

  if (PartList.length !== 3) {
    throw new Error('Series stream ID must use format tt1234567:season:episode')
  }

  const [ImdbIdStr, SeasonStr, EpisodeStr] = PartList
  const SeasonInt = Number(SeasonStr)
  const EpisodeInt = Number(EpisodeStr)

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

export async function StreamRoute(App: FastifyInstance) {
  App.get('/stream/movie/:imdbId.json', async (RequestObj, ReplyObj) => {
    SetNoCacheHeaders(ReplyObj)
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

  App.get('/stream/series/:id.json', async (RequestObj, ReplyObj) => {
    SetNoCacheHeaders(ReplyObj)
    try {
      const ParamsObj = StremioIdParamSchema.parse(RequestObj.params)
      const ParsedObj = ParseSeriesStremioId(ParamsObj.id)
      const LinkObj = await GetSerieLink(ParsedObj.imdbId, ParsedObj.season, ParsedObj.episode)

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

      if (ErrorObj instanceof Error) {
        return ReplyObj.status(400).send({
          streams: [],
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
      const ParamsObj = z.object({
        imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
        season: z.coerce.number().int().positive('Season must be a positive number'),
        episode: z.coerce.number().int().positive('Episode must be a positive number'),
      }).parse(RequestObj.params)

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
