import { z } from 'zod'

export const ImdbIdRegex = /^tt\d{7,10}$/

function IsPrivateIpv4Address(HostnameStr: string): boolean {
  const PartsArr = HostnameStr.split('.').map((PartStr) => Number(PartStr))

  if (PartsArr.length !== 4 || PartsArr.some((PartInt) => !Number.isInteger(PartInt) || PartInt < 0 || PartInt > 255)) {
    return false
  }

  const [FirstInt, SecondInt] = PartsArr

  return FirstInt === 10
    || FirstInt === 127
    || (FirstInt === 172 && SecondInt >= 16 && SecondInt <= 31)
    || (FirstInt === 192 && SecondInt === 168)
    || (FirstInt === 169 && SecondInt === 254)
    || FirstInt === 0
}

function IsSafeStreamUrl(UrlStr: string): boolean {
  try {
    const UrlObj = new URL(UrlStr)
    const HostnameStr = UrlObj.hostname.toLowerCase()

    if (!['http:', 'https:'].includes(UrlObj.protocol)) {
      return false
    }

    if (HostnameStr === 'localhost' || HostnameStr.endsWith('.localhost')) {
      return false
    }

    if (HostnameStr === '::1' || HostnameStr === '[::1]') {
      return false
    }

    return !IsPrivateIpv4Address(HostnameStr)
  } catch {
    return false
  }
}

const UrlSchema = z
  .string()
  .trim()
  .min(1, 'Link is required')
  .url('Stream URL must be a valid URL')
  .refine(IsSafeStreamUrl, 'Stream URL must use http or https and cannot point to localhost or private network addresses')

export const MovieLinkSchema = z.object({
  imdbId: z.string().trim().min(1, 'IMDb ID is required').regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  url: UrlSchema,
})

export const SerieLinkSchema = z.object({
  imdbId: z.string().trim().min(1, 'IMDb ID is required').regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  season: z.coerce.number().int().positive('Season must be a positive number'),
  episode: z.coerce.number().int().positive('Episode must be a positive number'),
  url: UrlSchema,
})

export const MovieStreamParamSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
})

export const SeriesIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Series ID is required'),
})

export const SeriesPathParamSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  season: z.coerce.number().int().positive('Season must be a positive number'),
  episode: z.coerce.number().int().positive('Episode must be a positive number'),
})
