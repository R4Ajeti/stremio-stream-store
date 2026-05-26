const TokenStorageKeyStr = 'stremio-route-analytics-token'
const PaletteArr = ['#64d2ff', '#7ddc91', '#ffcc66', '#f472b6', '#a78bfa']

const ElementsObj = {
  tokenForm: document.getElementById('tokenForm'),
  tokenInput: document.getElementById('tokenInput'),
  refreshButton: document.getElementById('refreshButton'),
  statusStrip: document.querySelector('.status-strip'),
  statusText: document.getElementById('statusText'),
  lastUpdatedText: document.getElementById('lastUpdatedText'),
  totalHits: document.getElementById('totalHits'),
  totalHitsDelta: document.getElementById('totalHitsDelta'),
  uniqueVisitors: document.getElementById('uniqueVisitors'),
  uniqueVisitorsDelta: document.getElementById('uniqueVisitorsDelta'),
  recentHits: document.getElementById('recentHits'),
  recentHitsDelta: document.getElementById('recentHitsDelta'),
  recentHitsDeltaWrap: document.getElementById('recentHitsDeltaWrap'),
  trackedRoutes: document.getElementById('trackedRoutes'),
  todayLabel: document.getElementById('todayLabel'),
  trendLabel: document.getElementById('trendLabel'),
  topRoutesChart: document.getElementById('topRoutesChart'),
  todayRoutesChart: document.getElementById('todayRoutesChart'),
  trendChart: document.getElementById('trendChart'),
  countriesPanel: document.getElementById('countriesPanel'),
  devicesPanel: document.getElementById('devicesPanel'),
  browsersPanel: document.getElementById('browsersPanel'),
  operatingSystemsPanel: document.getElementById('operatingSystemsPanel'),
  routesTableBody: document.getElementById('routesTableBody'),
}

const UrlParamsObj = new URLSearchParams(window.location.search)
const UrlTokenStr = UrlParamsObj.get('token') || ''
let AccessTokenStr = UrlTokenStr || localStorage.getItem(TokenStorageKeyStr) || ''

if (UrlTokenStr) {
  localStorage.setItem(TokenStorageKeyStr, UrlTokenStr)
  window.history.replaceState({}, document.title, window.location.pathname)
}

ElementsObj.tokenInput.value = AccessTokenStr

function FormatNumber(ValueInt) {
  return new Intl.NumberFormat().format(Number(ValueInt || 0))
}

function FormatDelta(ValueInt, ForceSignBool = false) {
  const NumericValueInt = Number(ValueInt || 0)
  const AbsStr = FormatNumber(Math.abs(NumericValueInt))

  if (NumericValueInt > 0) {
    return `+${AbsStr}`
  }

  if (NumericValueInt < 0) {
    return `-${AbsStr}`
  }

  return ForceSignBool ? '+0' : '0'
}

function FormatDateTime(IsoStr) {
  if (!IsoStr) {
    return 'Never'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(IsoStr))
}

function SetStatus(MessageStr, IsErrorBool = false) {
  ElementsObj.statusText.textContent = MessageStr
  ElementsObj.statusStrip.classList.toggle('error', IsErrorBool)
}

function SetSummary(DataObj, DaysArr) {
  ElementsObj.totalHits.textContent = FormatNumber(DataObj.totals.hits)
  ElementsObj.totalHitsDelta.textContent = FormatDelta(DataObj.totals.todayHits, true)
  ElementsObj.uniqueVisitors.textContent = FormatNumber(DataObj.totals.visitors)
  ElementsObj.uniqueVisitorsDelta.textContent = FormatDelta(DataObj.totals.todayVisitors, true)
  ElementsObj.recentHits.textContent = FormatNumber(DataObj.totals.recentHits)
  ElementsObj.trackedRoutes.textContent = FormatNumber(DataObj.totals.routes)
  ElementsObj.todayLabel.textContent = `${DataObj.today} (${DataObj.timeZone})`
  ElementsObj.trendLabel.textContent = 'Last 14 days'

  const RecentSummaryInt = 7
  const RecentDaysArr = DaysArr.slice(-RecentSummaryInt)
  const PreviousDaysArr = DaysArr.slice(-(RecentSummaryInt * 2), -RecentSummaryInt)
  const RecentTotalInt = RecentDaysArr.reduce((TotalInt, DayObj) => TotalInt + DayObj.hits, 0)
  const PreviousTotalInt = PreviousDaysArr.reduce((TotalInt, DayObj) => TotalInt + DayObj.hits, 0)
  const DifferenceInt = RecentTotalInt - PreviousTotalInt
  const DeltaClassStr = DifferenceInt > 0 ? 'positive' : DifferenceInt < 0 ? 'negative' : 'neutral'

  ElementsObj.recentHitsDelta.textContent = FormatDelta(DifferenceInt)
  ElementsObj.recentHitsDeltaWrap.classList.remove('positive', 'negative', 'neutral')
  ElementsObj.recentHitsDeltaWrap.classList.add(DeltaClassStr)
}

function CreateEmptyState(MessageStr) {
  const EmptyElement = document.createElement('div')
  EmptyElement.className = 'empty-state'
  EmptyElement.textContent = MessageStr
  return EmptyElement
}

function RenderBarChart(ContainerElement, RoutesArr, ValueKeyStr, EmptyMessageStr) {
  ContainerElement.replaceChildren()

  const TopRoutesArr = [...RoutesArr]
    .sort((LeftObj, RightObj) => Number(RightObj[ValueKeyStr] || 0) - Number(LeftObj[ValueKeyStr] || 0))
    .slice(0, 5)
  const MaxValueInt = Math.max(...TopRoutesArr.map((RouteObj) => Number(RouteObj[ValueKeyStr] || 0)), 0)

  if (MaxValueInt === 0) {
    ContainerElement.appendChild(CreateEmptyState(EmptyMessageStr))
    return
  }

  for (const [IndexInt, RouteObj] of TopRoutesArr.entries()) {
    const ValueInt = Number(RouteObj[ValueKeyStr] || 0)
    const RowElement = document.createElement('div')
    const MetaElement = document.createElement('div')
    const LabelElement = document.createElement('span')
    const ValueElement = document.createElement('strong')
    const TrackElement = document.createElement('div')
    const FillElement = document.createElement('div')

    RowElement.className = 'bar-row'
    MetaElement.className = 'bar-meta'
    LabelElement.className = 'route-label'
    LabelElement.title = RouteObj.route
    LabelElement.textContent = RouteObj.route
    ValueElement.textContent = FormatNumber(ValueInt)
    TrackElement.className = 'bar-track'
    FillElement.className = 'bar-fill'
    FillElement.style.width = `${Math.max((ValueInt / MaxValueInt) * 100, 2)}%`
    FillElement.style.background = PaletteArr[IndexInt % PaletteArr.length]

    MetaElement.append(LabelElement, ValueElement)
    TrackElement.appendChild(FillElement)
    RowElement.append(MetaElement, TrackElement)
    ContainerElement.appendChild(RowElement)
  }
}

function AggregateDays(RoutesArr) {
  const DateTotalsObj = new Map()

  for (const RouteObj of RoutesArr) {
    for (const DayObj of RouteObj.days || []) {
      DateTotalsObj.set(DayObj.date, Number(DateTotalsObj.get(DayObj.date) || 0) + Number(DayObj.hits || 0))
    }
  }

  return [...DateTotalsObj.entries()]
    .map(([DateStr, HitsInt]) => ({ date: DateStr, hits: HitsInt }))
    .sort((LeftObj, RightObj) => LeftObj.date.localeCompare(RightObj.date))
}

function RenderTrendChart(DaysArr) {
  const MaxHitsInt = Math.max(...DaysArr.map((DayObj) => DayObj.hits), 0)

  if (!DaysArr.length || MaxHitsInt === 0) {
    ElementsObj.trendChart.replaceChildren(CreateEmptyState('No daily traffic yet'))
    return
  }

  const WidthInt = 680
  const HeightInt = 190
  const PaddingInt = 24
  const BottomPaddingInt = 34
  const InnerWidthInt = WidthInt - (PaddingInt * 2)
  const InnerHeightInt = HeightInt - PaddingInt - BottomPaddingInt
  const PointDataArr = DaysArr.map((DayObj, IndexInt) => {
    const XInt = PaddingInt + ((InnerWidthInt / Math.max(DaysArr.length - 1, 1)) * IndexInt)
    const YInt = PaddingInt + (InnerHeightInt - ((DayObj.hits / MaxHitsInt) * InnerHeightInt))

    return {
      date: DayObj.date,
      hits: DayObj.hits,
      x: XInt,
      y: YInt,
    }
  })
  const PointsStr = PointDataArr
    .map((PointObj) => `${PointObj.x.toFixed(2)},${PointObj.y.toFixed(2)}`)
    .join(' ')
  const AreaPointsStr = `${PaddingInt},${HeightInt - BottomPaddingInt} ${PointsStr} ${WidthInt - PaddingInt},${HeightInt - BottomPaddingInt}`
  const FirstDateStr = DaysArr[0].date
  const LastDateStr = DaysArr[DaysArr.length - 1].date
  const PointsMarkupStr = PointDataArr
    .map((PointObj) => `
      <g class="trend-point-group" data-date="${PointObj.date}" data-hits="${PointObj.hits}" tabindex="0" role="button" aria-label="${PointObj.date}: ${FormatNumber(PointObj.hits)} hits">
        <circle class="trend-hit" cx="${PointObj.x.toFixed(2)}" cy="${PointObj.y.toFixed(2)}" r="12"></circle>
        <circle class="trend-point" cx="${PointObj.x.toFixed(2)}" cy="${PointObj.y.toFixed(2)}" r="4"></circle>
      </g>
    `)
    .join('')

  ElementsObj.trendChart.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${WidthInt} ${HeightInt}" role="img" aria-label="Daily route hits">
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#64d2ff" stop-opacity="0.26"></stop>
          <stop offset="100%" stop-color="#64d2ff" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <line x1="${PaddingInt}" y1="${PaddingInt}" x2="${PaddingInt}" y2="${HeightInt - BottomPaddingInt}" stroke="#273044" stroke-width="1"></line>
      <line x1="${PaddingInt}" y1="${HeightInt - BottomPaddingInt}" x2="${WidthInt - PaddingInt}" y2="${HeightInt - BottomPaddingInt}" stroke="#273044" stroke-width="1"></line>
      <polygon points="${AreaPointsStr}" fill="url(#trendFill)"></polygon>
      <polyline points="${PointsStr}" fill="none" stroke="#64d2ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${PointsMarkupStr}
    </svg>
    <div class="trend-tooltip" aria-hidden="true">
      <span class="trend-tooltip-date"></span>
      <strong class="trend-tooltip-value"></strong>
    </div>
    <div class="trend-labels">
      <span>${FirstDateStr}</span>
      <strong>${FormatNumber(MaxHitsInt)} peak</strong>
      <span>${LastDateStr}</span>
    </div>
  `

  const TooltipElement = ElementsObj.trendChart.querySelector('.trend-tooltip')
  const TooltipDateElement = ElementsObj.trendChart.querySelector('.trend-tooltip-date')
  const TooltipValueElement = ElementsObj.trendChart.querySelector('.trend-tooltip-value')
  const PointGroupElementsArr = [...ElementsObj.trendChart.querySelectorAll('.trend-point-group')]

  if (!TooltipElement || !TooltipDateElement || !TooltipValueElement || !PointGroupElementsArr.length) {
    return
  }

  const PositionTooltip = (TargetElement) => {
    const ContainerRect = ElementsObj.trendChart.getBoundingClientRect()
    const PointElement = TargetElement.querySelector('.trend-point')

    if (!PointElement) {
      return
    }

    const PointRect = PointElement.getBoundingClientRect()
    const TooltipRect = TooltipElement.getBoundingClientRect()
    const CenterX = PointRect.left + (PointRect.width / 2) - ContainerRect.left
    const CenterY = PointRect.top + (PointRect.height / 2) - ContainerRect.top
    const OffsetInt = 12
    let LeftInt = CenterX - (TooltipRect.width / 2)
    let TopInt = CenterY - TooltipRect.height - OffsetInt

    LeftInt = Math.min(Math.max(LeftInt, 8), ContainerRect.width - TooltipRect.width - 8)
    TopInt = Math.min(Math.max(TopInt, 8), ContainerRect.height - TooltipRect.height - 8)

    TooltipElement.style.left = `${LeftInt}px`
    TooltipElement.style.top = `${TopInt}px`
  }

  const ShowTooltip = (TargetElement) => {
    const HitsInt = Number(TargetElement.dataset.hits || 0)
    const DateStr = TargetElement.dataset.date || ''

    TooltipDateElement.textContent = DateStr
    TooltipValueElement.textContent = `${FormatNumber(HitsInt)} hits`
    TooltipElement.classList.add('is-visible')
    TooltipElement.setAttribute('aria-hidden', 'false')
    PointGroupElementsArr.forEach((Element) => Element.classList.toggle('is-active', Element === TargetElement))
    PositionTooltip(TargetElement)
  }

  const HideTooltip = () => {
    TooltipElement.classList.remove('is-visible')
    TooltipElement.setAttribute('aria-hidden', 'true')
    PointGroupElementsArr.forEach((Element) => Element.classList.remove('is-active'))
  }

  for (const PointGroupElement of PointGroupElementsArr) {
    PointGroupElement.addEventListener('mouseenter', () => ShowTooltip(PointGroupElement))
    PointGroupElement.addEventListener('mousemove', () => PositionTooltip(PointGroupElement))
    PointGroupElement.addEventListener('mouseleave', HideTooltip)
    PointGroupElement.addEventListener('focus', () => ShowTooltip(PointGroupElement))
    PointGroupElement.addEventListener('blur', HideTooltip)
    PointGroupElement.addEventListener('click', () => ShowTooltip(PointGroupElement))
    PointGroupElement.addEventListener('keydown', (EventObj) => {
      if (EventObj.key === 'Enter' || EventObj.key === ' ') {
        EventObj.preventDefault()
        ShowTooltip(PointGroupElement)
      }
    })
  }
}

function BuildDonutGradient(TopSegmentsArr) {
  const TotalInt = TopSegmentsArr.reduce((Total, SegmentObj) => Total + Number(SegmentObj.visitors || 0), 0)
  let CursorInt = 0
  const PartsArr = []

  for (const [IndexInt, SegmentObj] of TopSegmentsArr.entries()) {
    const SliceInt = TotalInt > 0 ? (Number(SegmentObj.visitors || 0) / TotalInt) * 360 : 0
    const ColorStr = PaletteArr[IndexInt % PaletteArr.length]
    PartsArr.push(`${ColorStr} ${CursorInt.toFixed(2)}deg ${(CursorInt + SliceInt).toFixed(2)}deg`)
    CursorInt += SliceInt
  }

  return PartsArr.length ? `conic-gradient(${PartsArr.join(', ')})` : ''
}

function RenderAudiencePanel(ContainerElement, SegmentsArr, EmptyMessageStr) {
  ContainerElement.replaceChildren()

  const TopSegmentsArr = [...SegmentsArr]
    .sort((LeftObj, RightObj) => Number(RightObj.visitors || 0) - Number(LeftObj.visitors || 0) || Number(RightObj.hits || 0) - Number(LeftObj.hits || 0))
    .slice(0, 5)
  const TotalVisitorsInt = TopSegmentsArr.reduce((TotalInt, SegmentObj) => TotalInt + Number(SegmentObj.visitors || 0), 0)

  if (!TopSegmentsArr.length || TotalVisitorsInt === 0) {
    ContainerElement.appendChild(CreateEmptyState(EmptyMessageStr))
    return
  }

  const ContentElement = document.createElement('div')
  const DonutWrapElement = document.createElement('div')
  const DonutElement = document.createElement('div')
  const DonutCenterElement = document.createElement('div')
  const DonutTotalElement = document.createElement('strong')
  const DonutLabelElement = document.createElement('span')
  const ListElement = document.createElement('div')

  ContentElement.className = 'audience-content'
  DonutWrapElement.className = 'donut-wrap'
  DonutElement.className = 'donut-visual'
  DonutElement.style.background = BuildDonutGradient(TopSegmentsArr)
  DonutCenterElement.className = 'donut-center'
  DonutTotalElement.textContent = FormatNumber(TotalVisitorsInt)
  DonutLabelElement.textContent = 'visitors'
  ListElement.className = 'segment-list'

  DonutCenterElement.append(DonutTotalElement, DonutLabelElement)
  DonutElement.appendChild(DonutCenterElement)

  for (const [IndexInt, SegmentObj] of TopSegmentsArr.entries()) {
    const VisitorsInt = Number(SegmentObj.visitors || 0)
    const PercentInt = TotalVisitorsInt > 0 ? Math.round((VisitorsInt / TotalVisitorsInt) * 100) : 0
    const RowElement = document.createElement('div')
    const MetaElement = document.createElement('div')
    const NameElement = document.createElement('span')
    const ValueElement = document.createElement('strong')
    const TrackElement = document.createElement('div')
    const FillElement = document.createElement('div')

    RowElement.className = 'segment-row'
    MetaElement.className = 'segment-meta'
    NameElement.className = 'segment-name'
    NameElement.title = SegmentObj.label
    NameElement.textContent = `${SegmentObj.flag ? `${SegmentObj.flag} ` : ''}${SegmentObj.label}`
    ValueElement.className = 'segment-value'
    ValueElement.textContent = `${PercentInt}%`
    TrackElement.className = 'segment-track'
    FillElement.className = 'segment-fill'
    FillElement.style.width = `${Math.max(PercentInt, 2)}%`
    FillElement.style.background = PaletteArr[IndexInt % PaletteArr.length]

    MetaElement.append(NameElement, ValueElement)
    TrackElement.appendChild(FillElement)
    RowElement.append(MetaElement, TrackElement)
    ListElement.appendChild(RowElement)
  }

  DonutWrapElement.append(DonutElement, ListElement)
  ContentElement.appendChild(DonutWrapElement)
  ContainerElement.appendChild(ContentElement)
}

function AppendCell(RowElement, TextStr, ClassStr = '') {
  const CellElement = document.createElement('td')
  CellElement.textContent = TextStr

  if (ClassStr) {
    CellElement.className = ClassStr
  }

  RowElement.appendChild(CellElement)
}

function RenderRoutesTable(RoutesArr) {
  ElementsObj.routesTableBody.replaceChildren()

  for (const [IndexInt, RouteObj] of RoutesArr.entries()) {
    const RowElement = document.createElement('tr')
    const RouteCellElement = document.createElement('td')
    const RouteLabelElement = document.createElement('span')
    const MethodCellElement = document.createElement('td')
    const MethodBadgeElement = document.createElement('span')

    AppendCell(RowElement, `#${IndexInt + 1}`, 'rank-cell')

    RouteLabelElement.className = 'route-label'
    RouteLabelElement.title = RouteObj.route
    RouteLabelElement.textContent = RouteObj.route
    RouteCellElement.appendChild(RouteLabelElement)
    RowElement.appendChild(RouteCellElement)

    MethodBadgeElement.className = `method-badge ${String(RouteObj.method).toLowerCase()}`
    MethodBadgeElement.textContent = RouteObj.method
    MethodCellElement.appendChild(MethodBadgeElement)
    RowElement.appendChild(MethodCellElement)

    AppendCell(RowElement, FormatNumber(RouteObj.hits), 'number-cell')
    AppendCell(RowElement, FormatNumber(RouteObj.todayHits), 'number-cell')
    AppendCell(RowElement, FormatNumber(RouteObj.recentHits), 'number-cell')
    AppendCell(RowElement, FormatDateTime(RouteObj.lastHitAt), RouteObj.lastHitAt ? '' : 'muted-cell')

    ElementsObj.routesTableBody.appendChild(RowElement)
  }
}

function RenderDashboard(DataObj) {
  const DaysArr = AggregateDays(DataObj.routes)

  SetSummary(DataObj, DaysArr)
  RenderBarChart(ElementsObj.topRoutesChart, DataObj.routes, 'hits', 'No route hits yet')
  RenderBarChart(ElementsObj.todayRoutesChart, DataObj.routes, 'todayHits', 'No traffic today')
  RenderTrendChart(DaysArr)
  RenderAudiencePanel(ElementsObj.countriesPanel, DataObj.audience.countries, 'No country data yet')
  RenderAudiencePanel(ElementsObj.devicesPanel, DataObj.audience.devices, 'No device data yet')
  RenderAudiencePanel(ElementsObj.browsersPanel, DataObj.audience.browsers, 'No browser data yet')
  RenderAudiencePanel(ElementsObj.operatingSystemsPanel, DataObj.audience.operatingSystems, 'No operating system data yet')
  RenderRoutesTable(DataObj.routes)
}

async function LoadAnalytics() {
  const HeadersObj = {}

  if (AccessTokenStr) {
    HeadersObj.Authorization = `Bearer ${AccessTokenStr}`
  }

  SetStatus('Loading analytics...')
  ElementsObj.lastUpdatedText.textContent = ''

  try {
    const ResponseObj = await fetch('/api/analytics/routes', {
      headers: HeadersObj,
      cache: 'no-store',
    })

    if (ResponseObj.status === 401) {
      throw new Error('Access token required')
    }

    if (!ResponseObj.ok) {
      throw new Error(`Analytics request failed (${ResponseObj.status})`)
    }

    const DataObj = await ResponseObj.json()
    RenderDashboard(DataObj)
    SetStatus('Analytics loaded')
    ElementsObj.lastUpdatedText.textContent = `Updated ${FormatDateTime(new Date().toISOString())}`
  } catch (ErrorObj) {
    SetStatus(ErrorObj instanceof Error ? ErrorObj.message : 'Unable to load analytics', true)
  }
}

ElementsObj.tokenForm.addEventListener('submit', async (EventObj) => {
  EventObj.preventDefault()

  AccessTokenStr = ElementsObj.tokenInput.value.trim()

  if (AccessTokenStr) {
    localStorage.setItem(TokenStorageKeyStr, AccessTokenStr)
  } else {
    localStorage.removeItem(TokenStorageKeyStr)
  }

  await LoadAnalytics()
})

ElementsObj.refreshButton.addEventListener('click', LoadAnalytics)

LoadAnalytics()
