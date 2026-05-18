import { RealtimeDb } from './firebase.service.js'
import { GetCurrentIsoDateStr } from '../utils/date.util.js'
import type { MovieLinkRequest, SaveLinkResult, SerieLinkRequest, StoredLink } from '../types/link.type.js'

function GetMoviePathStr(ImdbIdStr: string): string {
  return `link/movie/${ImdbIdStr}`
}

function GetSeriePathStr(ImdbIdStr: string, SeasonInt: number, EpisodeInt: number): string {
  return `link/serie/${ImdbIdStr}/${SeasonInt}/${EpisodeInt}`
}

async function SaveAtPath(PathStr: string, UrlStr: string): Promise<SaveLinkResult> {
  const RefObj = RealtimeDb.ref(PathStr)
  const SnapshotObj = await RefObj.get()
  const CurrentIsoStr = GetCurrentIsoDateStr()
  const ExistingObj = SnapshotObj.exists() ? SnapshotObj.val() as Partial<StoredLink> : null

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
  return SaveAtPath(GetSeriePathStr(RequestObj.imdbId, RequestObj.season, RequestObj.episode), RequestObj.url)
}

export async function GetMovieLink(ImdbIdStr: string): Promise<StoredLink | null> {
  const SnapshotObj = await RealtimeDb.ref(GetMoviePathStr(ImdbIdStr)).get()

  if (!SnapshotObj.exists()) {
    return null
  }

  return SnapshotObj.val() as StoredLink
}

export async function GetSerieLink(ImdbIdStr: string, SeasonInt: number, EpisodeInt: number): Promise<StoredLink | null> {
  const SnapshotObj = await RealtimeDb.ref(GetSeriePathStr(ImdbIdStr, SeasonInt, EpisodeInt)).get()

  if (!SnapshotObj.exists()) {
    return null
  }

  return SnapshotObj.val() as StoredLink
}
