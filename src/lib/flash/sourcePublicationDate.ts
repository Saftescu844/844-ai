/** Source publication is a calendar day, stored as an ISO timestamp by Payload. */
export function sourcePublicationCalendarDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

/** Called only after an editor changes the calendar; rendering never rewrites data. */
export function sourcePublicationTimestamp(calendarDate: string): string | null {
  if (!calendarDate) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) {
    throw new RangeError('Invalid source publication calendar date')
  }
  const timestamp = `${calendarDate}T00:00:00.000Z`
  if (sourcePublicationCalendarDate(timestamp) !== calendarDate) {
    throw new RangeError('Invalid source publication calendar date')
  }
  return timestamp
}

export function formatSourcePublicationDate(
  value: string | null | undefined,
  language: string,
): string | null {
  const calendarDate = sourcePublicationCalendarDate(value)
  if (!calendarDate) return null
  return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${calendarDate}T00:00:00.000Z`))
}
