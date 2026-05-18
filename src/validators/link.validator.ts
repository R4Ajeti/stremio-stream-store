import { z } from 'zod'

export const ImdbIdRegex = /^tt\d{7,10}$/

const UrlSchema = z.string().trim().min(1, 'Link is required')

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
