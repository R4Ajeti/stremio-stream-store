import { RealtimeDb } from './firebase.service.js'
import { GetCurrentIsoDateStr } from '../utils/date.util.js'

const TrackTimeoutMsInt = 750

export interface RouteAnalyticsRecord {
  route: string
  method: string
  hits: number
  firstHitAt: string
  lastHitAt: string
}

function NormalizeRouteStr(RouteStr: string): string {
  const [PathStr] = RouteStr.split('?')
  return PathStr || '/'
}

function NormalizeMethodStr(MethodStr: string): string {
  return MethodStr.trim().toUpperCase() || 'GET'
}

function GetRouteAnalyticsKeyStr(RouteStr: string, MethodStr: string): string {
  return Buffer
    .from(`${NormalizeMethodStr(MethodStr)} ${NormalizeRouteStr(RouteStr)}`)
    .toString('base64url')
}

async function IncrementRouteCounter(RouteStr: string, MethodStr: string): Promise<void> {
  const NormalizedRouteStr = NormalizeRouteStr(RouteStr)
  const NormalizedMethodStr = NormalizeMethodStr(MethodStr)
  const CurrentIsoStr = GetCurrentIsoDateStr()
  const RefObj = RealtimeDb.ref(`analytics/routes/${GetRouteAnalyticsKeyStr(NormalizedRouteStr, NormalizedMethodStr)}`)

  await RefObj.transaction((CurrentObj: RouteAnalyticsRecord | null) => {
    if (!CurrentObj) {
      return {
        route: NormalizedRouteStr,
        method: NormalizedMethodStr,
        hits: 1,
        firstHitAt: CurrentIsoStr,
        lastHitAt: CurrentIsoStr,
      }
    }

    return {
      ...CurrentObj,
      route: CurrentObj.route || NormalizedRouteStr,
      method: CurrentObj.method || NormalizedMethodStr,
      hits: Number(CurrentObj.hits || 0) + 1,
      firstHitAt: CurrentObj.firstHitAt || CurrentIsoStr,
      lastHitAt: CurrentIsoStr,
    }
  })
}

async function WaitForTrackResultOrTimeout(TrackPromiseObj: Promise<void | undefined>): Promise<void> {
  let TimeoutObj: NodeJS.Timeout | undefined
  const TimeoutPromiseObj = new Promise<void>((Resolve) => {
    TimeoutObj = setTimeout(Resolve, TrackTimeoutMsInt)
  })

  await Promise.race([TrackPromiseObj, TimeoutPromiseObj])

  if (TimeoutObj) {
    clearTimeout(TimeoutObj)
  }
}

export async function trackRoute(RouteStr: string, MethodStr: string): Promise<void> {
  const TrackPromiseObj = IncrementRouteCounter(RouteStr, MethodStr).catch(() => undefined)
  await WaitForTrackResultOrTimeout(TrackPromiseObj)
}

export async function GetRouteAnalytics(): Promise<RouteAnalyticsRecord[]> {
  const SnapshotObj = await RealtimeDb.ref('analytics/routes').get()

  if (!SnapshotObj.exists()) {
    return []
  }

  return Object
    .values(SnapshotObj.val() as Record<string, RouteAnalyticsRecord>)
    .sort((LeftObj, RightObj) => RightObj.hits - LeftObj.hits)
}
