import { createHash } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'

import { RealtimeDb } from './firebase.service.js'
import { Env } from '../config/env.js'
import { GetCurrentIsoDateStr } from '../utils/date.util.js'

const TrackTimeoutMsInt = 750
const RetainedDayCountInt = 90
const ResponseDayCountInt = 14
const RecentSummaryDayCountInt = 7
const AnalyticsTimeZoneStr = Env.ANALYTICS_TIME_ZONE
const AnalyticsIpSaltStr = Env.ANALYTICS_IP_SALT

const TrackedRoutesArr = [
  { route: '/', method: 'GET' },
  { route: '/set', method: 'GET' },
  { route: '/ui/analytics/routes', method: 'GET' },
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

interface StoredDayRecord {
  hits: number
  firstHitAt: string
  lastHitAt: string
}

interface StoredCounterRecord {
  key?: string
  label?: string
  flag?: string
  route?: string
  method?: string
  hits?: number
  firstHitAt?: string
  lastHitAt?: string
  days?: Record<string, StoredDayRecord>
}

export interface AnalyticsSegmentInfo {
  key: string
  label: string
  flag?: string
}

export interface AnalyticsRequestContext {
  method: string
  headers: IncomingHttpHeaders
  ip?: string
}

export interface AudienceSegmentRecord {
  key: string
  label: string
  flag?: string
  hits: number
  visitors: number
  todayHits: number
  todayVisitors: number
  percent: number
  todayPercent: number
}

export interface AudienceAnalyticsRecord {
  countries: AudienceSegmentRecord[]
  devices: AudienceSegmentRecord[]
  browsers: AudienceSegmentRecord[]
  operatingSystems: AudienceSegmentRecord[]
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
    visitors: number
    todayVisitors: number
    routes: number
  }
  audience: AudienceAnalyticsRecord
  routes: RouteAnalyticsRecord[]
}

function NormalizeRouteStr(RouteStr: string): string {
  const [PathStr] = RouteStr.split('?')
  return PathStr || '/'
}

function NormalizeMethodStr(MethodStr: string): string {
  return MethodStr.trim().toUpperCase() || 'GET'
}

function EncodeFirebaseKeyStr(ValueStr: string): string {
  return Buffer
    .from(ValueStr)
    .toString('base64url')
}

function GetRouteAnalyticsKeyStr(RouteStr: string, MethodStr: string): string {
  return EncodeFirebaseKeyStr(`${NormalizeMethodStr(MethodStr)} ${NormalizeRouteStr(RouteStr)}`)
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

function GetHeaderStr(HeadersObj: IncomingHttpHeaders, NameStr: string): string {
  const ValueObj = HeadersObj[NameStr.toLowerCase()]

  if (Array.isArray(ValueObj)) {
    return ValueObj[0] || ''
  }

  return ValueObj || ''
}

function GetClientIpStr(ContextObj: AnalyticsRequestContext): string {
  const ForwardedForStr = GetHeaderStr(ContextObj.headers, 'x-forwarded-for')
  const ForwardedIpStr = ForwardedForStr
    .split(',')
    .map((IpStr) => IpStr.trim())
    .find(Boolean)

  return ForwardedIpStr
    || GetHeaderStr(ContextObj.headers, 'x-real-ip')
    || GetHeaderStr(ContextObj.headers, 'cf-connecting-ip')
    || ContextObj.ip
    || ''
}

function GetVisitorHashStr(ContextObj: AnalyticsRequestContext): string {
  const UserAgentStr = GetHeaderStr(ContextObj.headers, 'user-agent')
  const IpStr = GetClientIpStr(ContextObj)
  const VisitorSourceStr = IpStr || UserAgentStr || 'unknown'

  return createHash('sha256')
    .update(`${AnalyticsIpSaltStr}:${VisitorSourceStr}:${UserAgentStr}`)
    .digest('hex')
    .slice(0, 40)
}

function GetCountryFlagStr(CountryCodeStr: string): string {
  if (CountryCodeStr === 'XX') {
    return ''
  }

  if (!/^[A-Z]{2}$/.test(CountryCodeStr)) {
    return ''
  }

  return CountryCodeStr
    .split('')
    .map((CharStr) => String.fromCodePoint(127397 + CharStr.charCodeAt(0)))
    .join('')
}

function GetCountryLabelStr(CountryCodeStr: string): string {
  if (CountryCodeStr === 'XX') {
    return 'Unknown'
  }

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(CountryCodeStr) || CountryCodeStr
  } catch (e) {
    return CountryCodeStr
  }
}

function GetCountryInfo(HeadersObj: IncomingHttpHeaders): AnalyticsSegmentInfo {
  const CountryCodeStr = (GetHeaderStr(HeadersObj, 'x-vercel-ip-country') || 'XX').toUpperCase()

  return {
    key: CountryCodeStr,
    label: GetCountryLabelStr(CountryCodeStr),
    flag: GetCountryFlagStr(CountryCodeStr),
  }
}

function GetDeviceInfo(UserAgentStr: string): AnalyticsSegmentInfo {
  if (/bot|crawler|spider|crawling/i.test(UserAgentStr)) {
    return { key: 'bot', label: 'Bot' }
  }

  if (/ipad|tablet|kindle|playbook|silk/i.test(UserAgentStr)) {
    return { key: 'tablet', label: 'Tablet' }
  }

  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(UserAgentStr)) {
    return { key: 'mobile', label: 'Mobile' }
  }

  if (!UserAgentStr) {
    return { key: 'unknown', label: 'Unknown' }
  }

  return { key: 'desktop', label: 'Desktop' }
}

function GetOperatingSystemInfo(UserAgentStr: string): AnalyticsSegmentInfo {
  const MatchArr: Array<[RegExp, AnalyticsSegmentInfo]> = [
    [/android/i, { key: 'android', label: 'Android' }],
    [/(iphone|ipad|ipod)/i, { key: 'ios', label: 'iOS' }],
    [/windows/i, { key: 'windows', label: 'Windows' }],
    [/mac os x|macintosh/i, { key: 'macos', label: 'macOS' }],
    [/cros/i, { key: 'chromeos', label: 'ChromeOS' }],
    [/linux/i, { key: 'linux', label: 'Linux' }],
  ]

  return MatchArr.find(([RegexObj]) => RegexObj.test(UserAgentStr))?.[1] || { key: 'unknown', label: 'Unknown' }
}

function GetBrowserInfo(UserAgentStr: string): AnalyticsSegmentInfo {
  const MatchArr: Array<[RegExp, AnalyticsSegmentInfo]> = [
    [/stremio/i, { key: 'stremio', label: 'Stremio' }],
    [/edg\//i, { key: 'edge', label: 'Edge' }],
    [/opr\/|opera/i, { key: 'opera', label: 'Opera' }],
    [/samsungbrowser/i, { key: 'samsung-internet', label: 'Samsung Internet' }],
    [/firefox|fxios/i, { key: 'firefox', label: 'Firefox' }],
    [/crios|chrome/i, { key: 'chrome', label: 'Chrome' }],
    [/safari/i, { key: 'safari', label: 'Safari' }],
    [/node|undici/i, { key: 'node-fetch', label: 'Node fetch' }],
  ]

  return MatchArr.find(([RegexObj]) => RegexObj.test(UserAgentStr))?.[1] || { key: 'unknown', label: 'Unknown' }
}

function GetRequestSegments(ContextObj: AnalyticsRequestContext): Record<string, AnalyticsSegmentInfo> {
  const UserAgentStr = GetHeaderStr(ContextObj.headers, 'user-agent')

  return {
    countries: GetCountryInfo(ContextObj.headers),
    devices: GetDeviceInfo(UserAgentStr),
    browsers: GetBrowserInfo(UserAgentStr),
    operatingSystems: GetOperatingSystemInfo(UserAgentStr),
  }
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

async function IncrementDimensionCounter(TypeStr: string, SegmentObj: AnalyticsSegmentInfo): Promise<void> {
  const CurrentIsoStr = GetCurrentIsoDateStr()
  const CurrentDateStr = GetAnalyticsDateKeyStr()
  const RefObj = RealtimeDb.ref(`analytics/dimensions/${TypeStr}/${EncodeFirebaseKeyStr(SegmentObj.key)}`)

  await RefObj.transaction((CurrentObj: StoredCounterRecord | null) => {
    if (!CurrentObj) {
      return {
        key: SegmentObj.key,
        label: SegmentObj.label,
        flag: SegmentObj.flag || '',
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
      key: CurrentObj.key || SegmentObj.key,
      label: SegmentObj.label || CurrentObj.label,
      flag: SegmentObj.flag || CurrentObj.flag || '',
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

async function UpsertVisitorRecords(ContextObj: AnalyticsRequestContext, SegmentsObj: Record<string, AnalyticsSegmentInfo>): Promise<void> {
  const CurrentIsoStr = GetCurrentIsoDateStr()
  const CurrentDateStr = GetAnalyticsDateKeyStr()
  const VisitorHashStr = GetVisitorHashStr(ContextObj)
  const VisitorObj = {
    visitorHash: VisitorHashStr,
    firstSeenAt: CurrentIsoStr,
    lastSeenAt: CurrentIsoStr,
    requestCount: 1,
    country: SegmentsObj.countries,
    device: SegmentsObj.devices,
    browser: SegmentsObj.browsers,
    operatingSystem: SegmentsObj.operatingSystems,
  }

  await Promise.all([
    RealtimeDb.ref(`analytics/visitors/${VisitorHashStr}`).transaction((CurrentObj: typeof VisitorObj | null) => {
      if (!CurrentObj) {
        return VisitorObj
      }

      return {
        ...CurrentObj,
        lastSeenAt: CurrentIsoStr,
        requestCount: Number(CurrentObj.requestCount || 0) + 1,
        country: VisitorObj.country,
        device: VisitorObj.device,
        browser: VisitorObj.browser,
        operatingSystem: VisitorObj.operatingSystem,
      }
    }),
    RealtimeDb.ref(`analytics/visitorDays/${CurrentDateStr}/${VisitorHashStr}`).transaction((CurrentObj: typeof VisitorObj | null) => {
      if (!CurrentObj) {
        return VisitorObj
      }

      return {
        ...CurrentObj,
        lastSeenAt: CurrentIsoStr,
        requestCount: Number(CurrentObj.requestCount || 0) + 1,
        country: VisitorObj.country,
        device: VisitorObj.device,
        browser: VisitorObj.browser,
        operatingSystem: VisitorObj.operatingSystem,
      }
    }),
  ])
}

async function TrackRequestAnalytics(RouteStr: string, ContextObj: AnalyticsRequestContext): Promise<void> {
  const SegmentsObj = GetRequestSegments(ContextObj)

  await Promise.all([
    IncrementRouteCounter(RouteStr, ContextObj.method),
    IncrementDimensionCounter('countries', SegmentsObj.countries),
    IncrementDimensionCounter('devices', SegmentsObj.devices),
    IncrementDimensionCounter('browsers', SegmentsObj.browsers),
    IncrementDimensionCounter('operatingSystems', SegmentsObj.operatingSystems),
    UpsertVisitorRecords(ContextObj, SegmentsObj),
  ])
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

export async function trackRoute(RouteStr: string, ContextObj: AnalyticsRequestContext): Promise<void> {
  if (!Env.ANALYTICS_ENABLED) {
    return
  }

  const TrackPromiseObj = TrackRequestAnalytics(RouteStr, ContextObj).catch(() => undefined)
  await WaitForTrackResultOrTimeout(TrackPromiseObj)
}

function BuildEmptyAudienceAnalytics(): AudienceAnalyticsRecord {
  return {
    countries: [],
    devices: [],
    browsers: [],
    operatingSystems: [],
  }
}

function BuildRouteRecord(
  RouteStr: string,
  MethodStr: string,
  StoredObj?: StoredCounterRecord,
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

function GetTodayHitsFromCounter(StoredObj: StoredCounterRecord, TodayStr: string): number {
  if (StoredObj.days?.[TodayStr]) {
    return Number(StoredObj.days[TodayStr].hits || 0)
  }

  if (StoredObj.firstHitAt && StoredObj.lastHitAt) {
    const FirstHitDateStr = GetAnalyticsDateKeyStr(new Date(StoredObj.firstHitAt))
    const LastHitDateStr = GetAnalyticsDateKeyStr(new Date(StoredObj.lastHitAt))

    if (FirstHitDateStr === TodayStr && LastHitDateStr === TodayStr) {
      return Number(StoredObj.hits || 0)
    }
  }

  return 0
}

function CountVisitorSegments(VisitorsObj: Record<string, any>, SegmentKeyStr: string): Map<string, number> {
  const CountsObj = new Map<string, number>()

  for (const VisitorObj of Object.values(VisitorsObj)) {
    const SegmentObj = VisitorObj?.[SegmentKeyStr] as AnalyticsSegmentInfo | undefined
    const KeyStr = SegmentObj?.key || 'unknown'
    CountsObj.set(KeyStr, Number(CountsObj.get(KeyStr) || 0) + 1)
  }

  return CountsObj
}

function BuildAudienceSegments(
  CountersObj: Record<string, StoredCounterRecord>,
  VisitorCountsObj: Map<string, number>,
  TodayVisitorCountsObj: Map<string, number>,
  TotalVisitorsInt: number,
  TodayVisitorsInt: number,
): AudienceSegmentRecord[] {
  const TodayStr = GetAnalyticsDateKeyStr()

  return Object
    .values(CountersObj)
    .map((StoredObj) => {
      const KeyStr = StoredObj.key || 'unknown'
      const VisitorsInt = Number(VisitorCountsObj.get(KeyStr) || 0)
      const TodayVisitorsForSegmentInt = Number(TodayVisitorCountsObj.get(KeyStr) || 0)

      return {
        key: KeyStr,
        label: StoredObj.label || KeyStr,
        flag: KeyStr === 'XX' ? '' : StoredObj.flag || '',
        hits: Number(StoredObj.hits || 0),
        visitors: VisitorsInt,
        todayHits: GetTodayHitsFromCounter(StoredObj, TodayStr),
        todayVisitors: TodayVisitorsForSegmentInt,
        percent: TotalVisitorsInt > 0 ? Math.round((VisitorsInt / TotalVisitorsInt) * 100) : 0,
        todayPercent: TodayVisitorsInt > 0 ? Math.round((TodayVisitorsForSegmentInt / TodayVisitorsInt) * 100) : 0,
      }
    })
    .sort((LeftObj, RightObj) => RightObj.visitors - LeftObj.visitors || RightObj.hits - LeftObj.hits)
}

async function GetAudienceAnalytics(): Promise<{
  audience: AudienceAnalyticsRecord
  visitors: number
  todayVisitors: number
}> {
  const TodayStr = GetAnalyticsDateKeyStr()
  const [DimensionsSnapshotObj, VisitorsSnapshotObj, TodayVisitorsSnapshotObj] = await Promise.all([
    RealtimeDb.ref('analytics/dimensions').get(),
    RealtimeDb.ref('analytics/visitors').get(),
    RealtimeDb.ref(`analytics/visitorDays/${TodayStr}`).get(),
  ])
  const DimensionsObj = DimensionsSnapshotObj.exists()
    ? DimensionsSnapshotObj.val() as Record<string, Record<string, StoredCounterRecord>>
    : {}
  const VisitorsObj = VisitorsSnapshotObj.exists()
    ? VisitorsSnapshotObj.val() as Record<string, any>
    : {}
  const TodayVisitorsObj = TodayVisitorsSnapshotObj.exists()
    ? TodayVisitorsSnapshotObj.val() as Record<string, any>
    : {}
  const TotalVisitorsInt = Object.keys(VisitorsObj).length
  const TodayVisitorsInt = Object.keys(TodayVisitorsObj).length

  return {
    visitors: TotalVisitorsInt,
    todayVisitors: TodayVisitorsInt,
    audience: {
      countries: BuildAudienceSegments(
        DimensionsObj.countries || {},
        CountVisitorSegments(VisitorsObj, 'country'),
        CountVisitorSegments(TodayVisitorsObj, 'country'),
        TotalVisitorsInt,
        TodayVisitorsInt,
      ),
      devices: BuildAudienceSegments(
        DimensionsObj.devices || {},
        CountVisitorSegments(VisitorsObj, 'device'),
        CountVisitorSegments(TodayVisitorsObj, 'device'),
        TotalVisitorsInt,
        TodayVisitorsInt,
      ),
      browsers: BuildAudienceSegments(
        DimensionsObj.browsers || {},
        CountVisitorSegments(VisitorsObj, 'browser'),
        CountVisitorSegments(TodayVisitorsObj, 'browser'),
        TotalVisitorsInt,
        TodayVisitorsInt,
      ),
      operatingSystems: BuildAudienceSegments(
        DimensionsObj.operatingSystems || {},
        CountVisitorSegments(VisitorsObj, 'operatingSystem'),
        CountVisitorSegments(TodayVisitorsObj, 'operatingSystem'),
        TotalVisitorsInt,
        TodayVisitorsInt,
      ),
    },
  }
}

export async function GetRouteAnalytics(): Promise<RouteAnalyticsResponse> {
  if (!Env.ANALYTICS_ENABLED) {
    const RoutesArr = TrackedRoutesArr.map((RouteObj) => BuildRouteRecord(RouteObj.route, RouteObj.method))

    return {
      today: GetAnalyticsDateKeyStr(),
      timeZone: AnalyticsTimeZoneStr,
      totals: {
        hits: 0,
        todayHits: 0,
        recentHits: 0,
        visitors: 0,
        todayVisitors: 0,
        routes: RoutesArr.length,
      },
      audience: BuildEmptyAudienceAnalytics(),
      routes: RoutesArr,
    }
  }

  const [SnapshotObj, AudienceObj] = await Promise.all([
    RealtimeDb.ref('analytics/routes').get(),
    GetAudienceAnalytics(),
  ])
  const StoredRoutesObj = SnapshotObj.exists()
    ? SnapshotObj.val() as Record<string, StoredCounterRecord>
    : {}
  const MergedRoutesObj = new Map<string, RouteAnalyticsRecord>()

  for (const RouteObj of TrackedRoutesArr) {
    MergedRoutesObj.set(
      GetRouteIdentifierStr(RouteObj.route, RouteObj.method),
      BuildRouteRecord(RouteObj.route, RouteObj.method),
    )
  }

  for (const StoredObj of Object.values(StoredRoutesObj)) {
    if (!StoredObj.route || !StoredObj.method) {
      continue
    }

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
      visitors: AudienceObj.visitors,
      todayVisitors: AudienceObj.todayVisitors,
      routes: RoutesArr.length,
    },
    audience: AudienceObj.audience,
    routes: RoutesArr,
  }
}
