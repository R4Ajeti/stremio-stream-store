import type { FastifyRequest } from 'fastify'

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

export function IsRequestAuthorized(
  RequestObj: FastifyRequest,
  RequiredTokenStr: string,
  OptionsObj: { allowQueryToken?: boolean } = {},
): boolean {
  if (!RequiredTokenStr) {
    return true
  }

  const BearerTokenStr = `Bearer ${RequiredTokenStr}`

  if (GetAuthorizationHeaderStr(RequestObj) === BearerTokenStr) {
    return true
  }

  return Boolean(OptionsObj.allowQueryToken && GetQueryTokenStr(RequestObj) === RequiredTokenStr)
}
