import { ZodError } from 'zod'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export type ApiErrorResponse = {
  ok: false
  error: {
    code: ApiErrorCode
    message: string
  }
}

export function ApiError(CodeStr: ApiErrorCode, MessageStr: string): ApiErrorResponse {
  return {
    ok: false,
    error: {
      code: CodeStr,
      message: MessageStr,
    },
  }
}

export function FormatApiError(ErrorObj: unknown): ApiErrorResponse {
  if (ErrorObj instanceof ZodError) {
    return ApiError('VALIDATION_ERROR', ErrorObj.errors[0]?.message || 'Invalid request')
  }

  return ApiError('INTERNAL_ERROR', 'Unexpected error')
}
