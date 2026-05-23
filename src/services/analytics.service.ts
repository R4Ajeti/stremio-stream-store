import { RealtimeDb } from './firebase.service.js'
import { GetCurrentIsoDateStr } from '../utils/date.util.js'

const TrackTimeoutMsInt = 750
const RetainedDayCountInt = 90
const ResponseDayCountInt = 14
const RecentSummaryDayCountInt = 7
const AnalyticsTimeZoneStr = process.env.ANALYTICS_TIME_ZONE || 'UTC'

const TrackedRoutesArr = [
  { route: '/', method: 'GET' },
  { route: '/set', method: 'GET' },
  { route: '/health', method: 'GET' },
  { route: '/favicon.ico', method: 'GET' },
  { route: '/manifest.json', method: 'GET' },
  { route: '/stream/movie/:imdbId.json', method: 'GET' },
  { route: '/stream/series/:id.json', method: 'GET' },
  { route: '/stream/series/:imdbId/:season/:episode.json', method: 'GET' },
  { route: '/api/link/movie', method: 'POST' },
  { route: '/api/link/serie', method: 'POST' },
] as const

export interface RouteAnalyticsDayRecord {
  date: string
  hits: number
  firstHitAt: string
  lastHitAt: string
}

export interface RouteAnalyticsRecord {
  route: string
  method: string
  hits: number
  todayHits: number
  recentHits: number
  firstHitAt: string
  lastHitAt: string
  days: RouteAnalyticsDayRecord[]
}

export interface RouteAnalyticsResponse {
  today: string
  timeZone: string
  totals: {
    hits: number
    todayHits: number
    recentHits: number
    routes: number
  }
  routes: RouteAnalyticsRecord[]
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

function GetRouteIdentifierStr(RouteStr: string, MethodStr: string): string {
  return `${NormalizeMethodStr(MethodStr)} ${NormalizeRouteStr(RouteStr)}`
}

function GetAnalyticsDateKeyStr(DateObj = new Date()): string {
  const PartsArr = new Intl.DateTimeFormat('en-US', {
    timeZone: AnalyticsTimeZoneStr,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(DateObj)

  const PartsObj = Object.fromEntries(PartsArr.map((PartObj) => [PartObj.type, PartObj.value]))
  return `${PartsObj.year}-${PartsObj.month}-${PartsObj.day}`
}

function GetRecentDateKeys(CountInt: number): string[] {
  const NowObj = new Date()

  return Array
    .from({ length: CountInt }, (_Value, IndexInt) => {
      const DateObj = new Date(NowObj)
      DateObj.setUTCDate(NowObj.getUTCDate() - IndexInt)
      return GetAnalyticsDateKeyStr(DateObj)
    })
    .reverse()
}

function TrimDayRecords(DaysObj: Record<string, Omit<RouteAnalyticsDayRecord, 'date'>>): Record<string, Omit<RouteAnalyticsDayRecord, 'date'>> {
  return Object.fromEntries(
    Object
      .entries(DaysObj)
      .sort(([LeftDateStr], [RightDateStr]) => RightDateStr.localeCompare(LeftDateStr))
      .slice(0, RetainedDayCountInt),
  )
}

async function IncrementRouteCounter(RouteStr: string, MethodStr: string): Promise<void> {
  const NormalizedRouteStr = NormalizeRouteStr(RouteStr)
  const NormalizedMethodStr = NormalizeMethodStr(MethodStr)
  const CurrentIsoStr = GetCurrentIsoDateStr()
  const CurrentDateStr = GetAnalyticsDateKeyStr()
  const RefObj = RealtimeDb.ref(`analytics/routes/${GetRouteAnalyticsKeyStr(NormalizedRouteStr, NormalizedMethodStr)}`)

  await RefObj.transaction((CurrentObj: (Omit<RouteAnalyticsRecord, 'todayHits' | 'recentHits' | 'days'> & {
    days?: Record<string, Omit<RouteAnalyticsDayRecord, 'date'>>
  }) | null) => {
    if (!CurrentObj) {
      return {
        route: NormalizedRouteStr,
        method: NormalizedMethodStr,
        hits: 1,
        firstHitAt: CurrentIsoStr,
        lastHitAt: CurrentIsoStr,
        days: {
          [CurrentDateStr]: {
            hits: 1,
            firstHitAt: CurrentIsoStr,
            lastHitAt: CurrentIsoStr,
          },
        },
      }
    }

    const DaysObj = CurrentObj.days || {}
    const CurrentDayObj = DaysObj[CurrentDateStr]

    return {
      ...CurrentObj,
      route: CurrentObj.route || NormalizedRouteStr,
      method: CurrentObj.method || NormalizedMethodStr,
      hits: Number(CurrentObj.hits || 0) + 1,
      firstHitAt: CurrentObj.firstHitAt || CurrentIsoStr,
      lastHitAt: CurrentIsoStr,
      days: TrimDayRecords({
        ...DaysObj,
        [CurrentDateStr]: {
          hits: Number(CurrentDayObj?.hits || 0) + 1,
          firstHitAt: CurrentDayObj?.firstHitAt || CurrentIsoStr,
          lastHitAt: CurrentIsoStr,
        },
      }),
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

function BuildRouteRecord(
  RouteStr: string,
  MethodStr: string,
  StoredObj?: Omit<RouteAnalyticsRecord, 'todayHits' | 'recentHits' | 'days'> & {
    days?: Record<string, Omit<RouteAnalyticsDayRecord, 'date'>>
  },
): RouteAnalyticsRecord {
  const TodayStr = GetAnalyticsDateKeyStr()
  const RecentDateKeysArr = GetRecentDateKeys(ResponseDayCountInt)
  const SummaryDateKeysSet = new Set(GetRecentDateKeys(RecentSummaryDayCountInt))
  const DaysObj = { ...(StoredObj?.days || {}) }

  if (StoredObj && !StoredObj.days && StoredObj.firstHitAt && StoredObj.lastHitAt) {
    const FirstHitDateStr = GetAnalyticsDateKeyStr(new Date(StoredObj.firstHitAt))
    const LastHitDateStr = GetAnalyticsDateKeyStr(new Date(StoredObj.lastHitAt))

    if (FirstHitDateStr === LastHitDateStr) {
      DaysObj[LastHitDateStr] = {
        hits: Number(StoredObj.hits || 0),
        firstHitAt: StoredObj.firstHitAt,
        lastHitAt: StoredObj.lastHitAt,
      }
    }
  }

  const DaysArr = RecentDateKeysArr.map((DateStr) => ({
    date: DateStr,
    hits: Number(DaysObj[DateStr]?.hits || 0),
    firstHitAt: DaysObj[DateStr]?.firstHitAt || '',
    lastHitAt: DaysObj[DateStr]?.lastHitAt || '',
  }))

  return {
    route: StoredObj?.route || RouteStr,
    method: StoredObj?.method || MethodStr,
    hits: Number(StoredObj?.hits || 0),
    todayHits: Number(DaysObj[TodayStr]?.hits || 0),
    recentHits: DaysArr
      .filter((DayObj) => SummaryDateKeysSet.has(DayObj.date))
      .reduce((TotalInt, DayObj) => TotalInt + DayObj.hits, 0),
    firstHitAt: StoredObj?.firstHitAt || '',
    lastHitAt: StoredObj?.lastHitAt || '',
    days: DaysArr,
  }
}

export async function GetRouteAnalytics(): Promise<RouteAnalyticsResponse> {
  const SnapshotObj = await RealtimeDb.ref('analytics/routes').get()
  const StoredRoutesObj = SnapshotObj.exists()
    ? SnapshotObj.val() as Record<string, Omit<RouteAnalyticsRecord, 'todayHits' | 'recentHits' | 'days'> & {
      days?: Record<string, Omit<RouteAnalyticsDayRecord, 'date'>>
    }>
    : {}
  const MergedRoutesObj = new Map<string, RouteAnalyticsRecord>()

  for (const RouteObj of TrackedRoutesArr) {
    MergedRoutesObj.set(
      GetRouteIdentifierStr(RouteObj.route, RouteObj.method),
      BuildRouteRecord(RouteObj.route, RouteObj.method),
    )
  }

  for (const StoredObj of Object.values(StoredRoutesObj)) {
    MergedRoutesObj.set(
      GetRouteIdentifierStr(StoredObj.route, StoredObj.method),
      BuildRouteRecord(StoredObj.route, StoredObj.method, StoredObj),
    )
  }

  const RoutesArr = Array
    .from(MergedRoutesObj.values())
    .sort((LeftObj, RightObj) => RightObj.hits - LeftObj.hits)

  return {
    today: GetAnalyticsDateKeyStr(),
    timeZone: AnalyticsTimeZoneStr,
    totals: {
      hits: RoutesArr.reduce((TotalInt, RouteObj) => TotalInt + RouteObj.hits, 0),
      todayHits: RoutesArr.reduce((TotalInt, RouteObj) => TotalInt + RouteObj.todayHits, 0),
      recentHits: RoutesArr.reduce((TotalInt, RouteObj) => TotalInt + RouteObj.recentHits, 0),
      routes: RoutesArr.length,
    },
    routes: RoutesArr,
  }
}
