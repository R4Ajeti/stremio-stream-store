import { z } from 'zod'

const ImdbIdRegex = /^tt\d{7,10}$/

export const MovieLinkSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  url: z.string().trim().url('URL must be valid'),
})

export const SerieLinkSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  season: z.coerce.number().int().positive('Season must be a positive number'),
  episode: z.coerce.number().int().positive('Episode must be a positive number'),
  url: z.string().trim().url('URL must be valid'),
})

export const ImdbIdParamSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
})

export const SerieStreamParamSchema = z.object({
  imdbId: z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567'),
  season: z.coerce.number().int().positive('Season must be a positive number'),
  episode: z.coerce.number().int().positive('Episode must be a positive number'),
})
