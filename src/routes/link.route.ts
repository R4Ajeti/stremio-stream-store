import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

import { Env } from '../config/env.js'
import {
  DeleteMovieLink,
  DeleteSerieLink,
  SaveMovieLink,
  SaveSerieLink,
} from '../services/link.service.js'
import {
  ImdbIdParamSchema,
  MovieLinkSchema,
  SerieLinkSchema,
  SerieStreamParamSchema,
} from '../validators/link.validator.js'

function VerifyAdmin(RequestObj: FastifyRequest, ReplyObj: FastifyReply): boolean {
  if (!Env.ADMIN_TOKEN) {
    return true
  }

  const AuthHeaderStr = RequestObj.headers.authorization || ''
  const TokenFromHeaderStr = AuthHeaderStr.startsWith('Bearer ')
    ? AuthHeaderStr.replace('Bearer ', '').trim()
    : ''

  const TokenFromBodyStr = typeof RequestObj.body === 'object' && RequestObj.body !== null && 'adminToken' in RequestObj.body
    ? String((RequestObj.body as { adminToken?: string }).adminToken || '')
    : ''

  if (TokenFromHeaderStr === Env.ADMIN_TOKEN || TokenFromBodyStr === Env.ADMIN_TOKEN) {
    return true
  }

  ReplyObj.status(401).send({
    ok: false,
    error: 'Unauthorized',
  })

  return false
}

export async function LinkRoute(App: FastifyInstance) {
  App.post('/movie', async (RequestObj, ReplyObj) => {
    if (!VerifyAdmin(RequestObj, ReplyObj)) {
      return
    }

    try {
      const BodyObj = MovieLinkSchema.parse(RequestObj.body)
      const ResultObj = await SaveMovieLink(BodyObj)

      return {
        ok: true,
        ...ResultObj,
      }
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          ok: false,
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send({
        ok: false,
        error: 'Failed to save movie link',
      })
    }
  })

  App.post('/serie', async (RequestObj, ReplyObj) => {
    if (!VerifyAdmin(RequestObj, ReplyObj)) {
      return
    }

    try {
      const BodyObj = SerieLinkSchema.parse(RequestObj.body)
      const ResultObj = await SaveSerieLink(BodyObj)

      return {
        ok: true,
        ...ResultObj,
      }
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          ok: false,
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send({
        ok: false,
        error: 'Failed to save series link',
      })
    }
  })

  App.delete('/movie/:imdbId', async (RequestObj, ReplyObj) => {
    if (!VerifyAdmin(RequestObj, ReplyObj)) {
      return
    }

    try {
      const ParamsObj = ImdbIdParamSchema.parse(RequestObj.params)
      await DeleteMovieLink(ParamsObj.imdbId)

      return {
        ok: true,
      }
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          ok: false,
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send({
        ok: false,
        error: 'Failed to delete movie link',
      })
    }
  })

  App.delete('/serie/:imdbId/:season/:episode', async (RequestObj, ReplyObj) => {
    if (!VerifyAdmin(RequestObj, ReplyObj)) {
      return
    }

    try {
      const ParamsObj = SerieStreamParamSchema.parse(RequestObj.params)
      await DeleteSerieLink(ParamsObj.imdbId, ParamsObj.season, ParamsObj.episode)

      return {
        ok: true,
      }
    } catch (ErrorObj) {
      if (ErrorObj instanceof ZodError) {
        return ReplyObj.status(400).send({
          ok: false,
          error: ErrorObj.errors[0]?.message || 'Invalid request',
        })
      }

      RequestObj.log.error(ErrorObj)
      return ReplyObj.status(500).send({
        ok: false,
        error: 'Failed to delete series link',
      })
    }
  })
}
