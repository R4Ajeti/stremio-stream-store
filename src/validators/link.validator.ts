import { z } from 'zod'

export const ImdbIdRegex = /^tt\d{7,10}$/

const ImdbIdSchema = z.string().trim().regex(ImdbIdRegex, 'IMDb ID must look like tt1234567')
const SeasonSchema = z.coerce.number().int().positive('Season must be a positive number')
const EpisodeSchema = z.coerce.number().int().positive('Episode must be a positive number')

export const MovieLinkSchema = z.object({
  imdbId: ImdbIdSchema,
  url: z.string().trim().url('URL must be valid'),
})

export const SerieLinkSchema = MovieLinkSchema.extend({
  season: SeasonSchema,
  episode: EpisodeSchema,
})

export const ImdbIdParamSchema = z.object({
  imdbId: ImdbIdSchema,
})

export const SerieStreamParamSchema = z.object({
  imdbId: ImdbIdSchema,
  season: SeasonSchema,
  episode: EpisodeSchema,
})
