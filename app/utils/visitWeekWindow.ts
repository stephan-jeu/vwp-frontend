export type IsoWeekWithinWindowParams = {
  week: number | null | undefined
  fromDate: string | null | undefined
  toDate: string | null | undefined
  label: string
}

function parseIsoDateUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const dt = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(dt.getTime())) return null
  return dt
}

function isoWeekStartUtc(year: number, week: number): Date | null {
  if (week < 1 || week > 53) return null

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dow = simple.getUTCDay() === 0 ? 7 : simple.getUTCDay()
  simple.setUTCDate(simple.getUTCDate() - dow + 4)

  const week1 = new Date(Date.UTC(simple.getUTCFullYear(), 0, 1))
  const week1Dow = week1.getUTCDay() === 0 ? 7 : week1.getUTCDay()
  week1.setUTCDate(week1.getUTCDate() - week1Dow + 4)

  const diffDays = (simple.getTime() - week1.getTime()) / (24 * 60 * 60 * 1000)
  const computedWeek = 1 + Math.round(diffDays / 7)
  if (computedWeek !== week) return null

  const monday = new Date(simple)
  monday.setUTCDate(simple.getUTCDate() - 3)
  return monday
}

function formatIsoDate(iso: string | null | undefined): string {
  return iso ?? 'onbekend'
}

export function validateIsoWeekWithinDateWindow(params: IsoWeekWithinWindowParams): string | null {
  const { week, fromDate, toDate, label } = params
  if (week == null) return null

  const fromDt = parseIsoDateUtc(fromDate)
  const toDt = parseIsoDateUtc(toDate)
  if (!fromDt || !toDt) return null

  const fromTime = fromDt.getTime()
  const toTime = toDt.getTime()
  if (fromTime > toTime) {
    return `${label}: "Van" ligt na "Tot" (${formatIsoDate(fromDate)} > ${formatIsoDate(toDate)}).`
  }

  const year = fromDt.getUTCFullYear()
  const weekStart = isoWeekStartUtc(year, week)
  if (!weekStart) {
    return `${label}: week ${week} is geen geldige ISO-week voor jaar ${year}.`
  }

  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4)

  const overlaps = weekStart.getTime() <= toTime && weekEnd.getTime() >= fromTime
  if (overlaps) return null

  return `${label}: week ${week} valt buiten bezoekvenster (${formatIsoDate(fromDate)} t/m ${formatIsoDate(toDate)}).`
}
