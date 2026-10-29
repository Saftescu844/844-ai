import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  formatSourcePublicationDate,
  sourcePublicationCalendarDate,
  sourcePublicationTimestamp,
} from '../../src/lib/flash/sourcePublicationDate'

describe('Flash source publication calendar day', () => {
  it('keeps the same source day west and east of UTC, including DST boundaries', () => {
    const modulePath = resolve('src/lib/flash/sourcePublicationDate.ts')
    const script = `import { sourcePublicationCalendarDate, sourcePublicationTimestamp, formatSourcePublicationDate } from ${JSON.stringify(modulePath)};
      console.log(JSON.stringify(['2026-08-12', '2026-03-29', '2026-10-25'].map(day => {
        const iso = day + 'T00:00:00.000Z';
        return [sourcePublicationCalendarDate(iso), sourcePublicationTimestamp(day), formatSourcePublicationDate(iso, 'ro'), formatSourcePublicationDate(iso, 'en')];
      })))`
    const expected = [
      ['2026-08-12', '2026-08-12T00:00:00.000Z', '12 august 2026', '12 August 2026'],
      ['2026-03-29', '2026-03-29T00:00:00.000Z', '29 martie 2026', '29 March 2026'],
      ['2026-10-25', '2026-10-25T00:00:00.000Z', '25 octombrie 2026', '25 October 2026'],
    ]
    for (const TZ of ['UTC', 'America/Los_Angeles', 'Europe/Bucharest', 'Pacific/Kiritimati', 'Etc/GMT+12']) {
      const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
        env: { ...process.env, TZ }, encoding: 'utf8',
      })
      expect(JSON.parse(output), TZ).toEqual(expected)
    }
  })

  it('handles optional and invalid stored dates without breaking the public page', () => {
    for (const value of [null, undefined, '', 'invalid-date']) {
      expect(sourcePublicationCalendarDate(value)).toBe('')
      expect(formatSourcePublicationDate(value, 'en')).toBeNull()
    }
    expect(sourcePublicationCalendarDate('2026-08-12')).toBe('2026-08-12')
    expect(sourcePublicationTimestamp('')).toBeNull()
  })

  it('accepts leap days and rejects impossible or non-calendar input', () => {
    expect(sourcePublicationTimestamp('2028-02-29')).toBe('2028-02-29T00:00:00.000Z')
    for (const value of ['2026-02-29', '2026-02-30', '2026-13-01', '08/12/2026', '2026-08-12T01:00:00Z']) {
      expect(() => sourcePublicationTimestamp(value)).toThrow(RangeError)
    }
  })
})
