/**
 * Read-only, deterministic npm audit inventory for GitHub Actions.
 * No secrets, provider requests, file mutations or production access.
 */
import { appendFileSync, readFileSync } from 'node:fs'

const [, , file, profile] = process.argv
if (!file || !['all', 'production'].includes(profile)) {
  console.error('Usage: node report-npm-audit.mjs <report.json> <all|production>')
  process.exit(2)
}
let report
try {
  report = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  console.error('AUDIT_UNAVAILABLE: invalid JSON')
  process.exit(1)
}
if (!report.vulnerabilities || !report.metadata?.vulnerabilities) {
  console.error('AUDIT_UNAVAILABLE: missing inventory')
  process.exit(1)
}
const counts = report.metadata.vulnerabilities
const rank = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 }
const packages = Object.entries(report.vulnerabilities).map(([name, data]) => {
  const advisories = (data.via || [])
    .filter(x => x && typeof x === 'object')
    .map(x => ({ id: x.source || '', title: x.title || '', url: x.url || '', range: x.range || '' }))
  const available = data.fixAvailable
  const fix = available === false ? 'none reported' : available === true
    ? 'available' : typeof available === 'object'
      ? String(available.version || 'unknown') + (available.isSemVerMajor ? ' (major)' : '')
      : 'unknown'
  return {
    name, severity: data.severity || 'unknown', direct: Boolean(data.isDirect),
    range: data.range || '', nodes: data.nodes || [], fix, advisories,
  }
}).sort((a, b) => (rank[a.severity] ?? 5) - (rank[b.severity] ?? 5) || a.name.localeCompare(b.name))
console.log('AUDIT_PROFILE=' + profile)
console.log('AUDIT_COUNTS=' + JSON.stringify(counts))
console.log('AUDIT_AFFECTED_PACKAGES=' + packages.length)
for (const item of packages) console.log('AUDIT_PACKAGE ' + JSON.stringify(item))
if (process.env.GITHUB_STEP_SUMMARY) {
  const header = ['### npm audit: ' + profile, '', '|Critical|High|Moderate|Low|Total|',
    '|---:|---:|---:|---:|---:|', '|' + (counts.critical || 0) + '|'
    + (counts.high || 0) + '|' + (counts.moderate || 0) + '|'
    + (counts.low || 0) + '|' + (counts.total || 0) + '|', '',
    '|Package|Severity|Direct|Fix|', '|---|---|---|---|']
  const rows = packages.map(x => '|' + x.name + '|' + x.severity + '|'
    + (x.direct ? 'yes' : 'no') + '|' + x.fix + '|')
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [...header, ...rows, ''].join('\n'))
}
