import { ZodError } from 'zod'

export interface ErrorResponse {
  ok: false
  error: string
}

export function GetValidationErrorMessage(ErrorObj: ZodError): string {
  return ErrorObj.errors[0]?.message || 'Invalid request'
}

export function IsValidationError(ErrorObj: unknown): ErrorObj is ZodError {
  return ErrorObj instanceof ZodError
}

export function ErrorBody(ErrorStr: string): ErrorResponse {
  return {
    ok: false,
    error: ErrorStr,
  }
}
