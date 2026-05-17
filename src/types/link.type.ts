export type LinkType = 'movie' | 'serie'

export interface StoredLink {
  url: string
  createdAt: string
  updatedAt: string
}

export interface MovieLinkRequest {
  imdbId: string
  url: string
}

export interface SerieLinkRequest {
  imdbId: string
  season: number
  episode: number
  url: string
}

export interface SaveLinkResult {
  path: string
  link: StoredLink
}

export interface StremioStream {
  title: string
  externalUrl: string
}

export interface StremioStreamResponse {
  streams: StremioStream[]
}
