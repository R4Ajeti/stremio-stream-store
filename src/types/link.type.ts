export type StoredLink = {
  url: string
  createdAt: string
  updatedAt: string
}

export type MovieLinkRequest = {
  imdbId: string
  url: string
}

export type SerieLinkRequest = {
  imdbId: string
  season: number
  episode: number
  url: string
}

export type SaveLinkResult = {
  path: string
  link: StoredLink
  wasCreated: boolean
}

export type StremioStreamResponse = {
  streams: Array<{
    title: string
    url: string
  }>
}
