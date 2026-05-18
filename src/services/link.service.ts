import { RealtimeDb } from './firebase.service.js'
import type { MovieLinkRequest, SaveLinkResult, SerieLinkRequest, StoredLink } from '../types/link.type.js'

function GetMoviePathStr(ImdbIdStr: string): string {
  return `link/movie/${ImdbIdStr}`
}

function GetSeriePathStr(ImdbIdStr: string, SeasonInt: number, EpisodeInt: number): string {
  return `link/serie/${ImdbIdStr}/${SeasonInt}/${EpisodeInt}`
}

async function GetStoredLink(PathStr: string): Promise<StoredLink | null> {
  const SnapshotObj = await RealtimeDb.ref(PathStr).get()
  return SnapshotObj.exists() ? SnapshotObj.val() as StoredLink : null
}

async function SaveAtPath(PathStr: string, UrlStr: string): Promise<SaveLinkResult> {
  const RefObj = RealtimeDb.ref(PathStr)
  const ExistingObj = await GetStoredLink(PathStr)
  const CurrentIsoStr = new Date().toISOString()

  const LinkObj: StoredLink = {
    url: UrlStr,
    createdAt: ExistingObj?.createdAt || CurrentIsoStr,
    updatedAt: CurrentIsoStr,
  }

  await RefObj.set(LinkObj)

  return {
    path: PathStr,
    link: LinkObj,
  }
}

export async function SaveMovieLink(RequestObj: MovieLinkRequest): Promise<SaveLinkResult> {
  return SaveAtPath(GetMoviePathStr(RequestObj.imdbId), RequestObj.url)
}

export async function SaveSerieLink(RequestObj: SerieLinkRequest): Promise<SaveLinkResult> {
  return SaveAtPath(
    GetSeriePathStr(RequestObj.imdbId, RequestObj.season, RequestObj.episode),
    RequestObj.url,
  )
}

export async function GetMovieLink(ImdbIdStr: string): Promise<StoredLink | null> {
  return GetStoredLink(GetMoviePathStr(ImdbIdStr))
}

export async function GetSerieLink(
  ImdbIdStr: string,
  SeasonInt: number,
  EpisodeInt: number,
): Promise<StoredLink | null> {
  return GetStoredLink(GetSeriePathStr(ImdbIdStr, SeasonInt, EpisodeInt))
}

export async function DeleteMovieLink(ImdbIdStr: string): Promise<void> {
  await RealtimeDb.ref(GetMoviePathStr(ImdbIdStr)).remove()
}

export async function DeleteSerieLink(
  ImdbIdStr: string,
  SeasonInt: number,
  EpisodeInt: number,
): Promise<void> {
  await RealtimeDb.ref(GetSeriePathStr(ImdbIdStr, SeasonInt, EpisodeInt)).remove()
}
