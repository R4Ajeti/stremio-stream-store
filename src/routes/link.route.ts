import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { ZodSchema } from 'zod'

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
import { ErrorBody, GetValidationErrorMessage, IsValidationError } from '../utils/response.util.js'

type RequestHandler<TInput, TResult> = (InputObj: TInput) => Promise<TResult>

async function HandleRequest<TInput, TResult>(
  RequestObj: FastifyRequest,
  ReplyObj: FastifyReply,
  SchemaObj: ZodSchema<TInput>,
  InputObj: unknown,
  FailureMessageStr: string,
  HandlerObj: RequestHandler<TInput, TResult>,
) {
  try {
    const ParsedObj = SchemaObj.parse(InputObj)
    const ResultObj = await HandlerObj(ParsedObj)

    return {
      ok: true,
      ...(ResultObj && typeof ResultObj === 'object' ? ResultObj : {}),
    }
  } catch (ErrorObj) {
    if (IsValidationError(ErrorObj)) {
      return ReplyObj.status(400).send(ErrorBody(GetValidationErrorMessage(ErrorObj)))
    }

    RequestObj.log.error(ErrorObj)
    return ReplyObj.status(500).send(ErrorBody(FailureMessageStr))
  }
}

export async function LinkRoute(App: FastifyInstance) {
  App.post('/movie', async (RequestObj, ReplyObj) => HandleRequest(
    RequestObj,
    ReplyObj,
    MovieLinkSchema,
    RequestObj.body,
    'Failed to save movie link',
    SaveMovieLink,
  ))

  App.post('/serie', async (RequestObj, ReplyObj) => HandleRequest(
    RequestObj,
    ReplyObj,
    SerieLinkSchema,
    RequestObj.body,
    'Failed to save series link',
    SaveSerieLink,
  ))

  App.delete('/movie/:imdbId', async (RequestObj, ReplyObj) => HandleRequest(
    RequestObj,
    ReplyObj,
    ImdbIdParamSchema,
    RequestObj.params,
    'Failed to delete movie link',
    async (ParamsObj) => {
      await DeleteMovieLink(ParamsObj.imdbId)
    },
  ))

  App.delete('/serie/:imdbId/:season/:episode', async (RequestObj, ReplyObj) => HandleRequest(
    RequestObj,
    ReplyObj,
    SerieStreamParamSchema,
    RequestObj.params,
    'Failed to delete series link',
    async (ParamsObj) => {
      await DeleteSerieLink(ParamsObj.imdbId, ParamsObj.season, ParamsObj.episode)
    },
  ))
}
