import { describe, expect, it } from 'vitest'

import { MovieLinkSchema, SerieLinkSchema } from '../src/validators/link.validator.js'

describe('link validators', () => {
  it('accepts valid movie and series link payloads', () => {
    expect(() => MovieLinkSchema.parse({
      imdbId: 'tt1234567',
      url: 'https://cdn.example.com/movie.mp4',
    })).not.toThrow()

    expect(() => SerieLinkSchema.parse({
      imdbId: 'tt1234567',
      season: '1',
      episode: '2',
      url: 'https://cdn.example.com/episode.mp4',
    })).not.toThrow()
  })

  it('rejects invalid IMDb IDs', () => {
    expect(() => MovieLinkSchema.parse({
      imdbId: '1234567',
      url: 'https://cdn.example.com/movie.mp4',
    })).toThrow('IMDb ID must look like tt1234567')
  })

  it('rejects unsupported URL protocols', () => {
    expect(() => MovieLinkSchema.parse({
      imdbId: 'tt1234567',
      url: 'file:///tmp/movie.mp4',
    })).toThrow('Stream URL must use http or https')
  })

  it('rejects localhost and private network URLs', () => {
    expect(() => MovieLinkSchema.parse({
      imdbId: 'tt1234567',
      url: 'http://localhost/movie.mp4',
    })).toThrow('Stream URL must use http or https')

    expect(() => MovieLinkSchema.parse({
      imdbId: 'tt1234567',
      url: 'https://192.168.1.20/movie.mp4',
    })).toThrow('Stream URL must use http or https')
  })
})
