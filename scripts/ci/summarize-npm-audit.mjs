import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

// Security inventory only: no package mutations, external credentials or DB.
// Compare the committed lockfile with an ephemeral npm install --package-lock-only
// resolution, which better approximates Railway's npm install build step.
const severityOrder = ['critical', 'high', 'moderate', 'low', 'info']

function loadAudit(file) {
  const report = JSON.parse(readFileSync(file, 'utf8'))
  if (
    report.error ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    !report.metadata?.vulnerabilities ||
    typeof report.metadata.vulnerabilities.total !== 'number'
  ) {
    throw new Error('Invalid or incomplete npm audit response: ' + file)
  }
  return report
}

function counts(report) {
  return Object.fromEntries(
    [...severityOrder, 'total'].map((level) => [
      level,
      report.metadata.vulnerabilities[level] ?? 0,
    ]),
  )
}

function fixLabel(value) {
  if (value === false) return 'unavailable'
  if (value === true) return 'available'
  if (value && typeof value === 'object') {
    return (value.isSemVerMajor ? 'major: ' : 'update: ') +
      String(value.name ?? '') + '@' + String(value.version ?? '')
  }
  return 'unknown'
}

function csvCell(value) {
  return '"' + String(value ?? '').replaceAll('"', '""') + '"'
}

function markdownCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function advisories(item) {
  return Array.isArray(item?.via)
    ? item.via.filter((source) => source && typeof source === 'object')
      .map((source) => ({
        title: String(source.title ?? ''),
        url: String(source.url ?? ''),
        range: String(source.range ?? ''),
        severity: String(source.severity ?? ''),
      }))
    : []
}

const lockedAll = loadAudit('audit/all.json')
const lockedProduction = loadAudit('audit/production-graph.json')
const resolvedAll = loadAudit('audit/resolved-all.json')
const resolvedProduction = loadAudit('audit/resolved-production-graph.json')

const lockedNames = new Set(Object.keys(lockedAll.vulnerabilities))
const lockedProductionNames = new Set(Object.keys(lockedProduction.vulnerabilities))
const resolvedNames = new Set(Object.keys(resolvedAll.vulnerabilities))
const resolvedProductionNames = new Set(Object.keys(resolvedProduction.vulnerabilities))

const rows = [...new Set([...lockedNames, ...resolvedNames])].map((name) => {
  const item = resolvedAll.vulnerabilities[name] ?? lockedAll.vulnerabilities[name]
  return {
    name,
    severity: String(item.severity ?? 'unknown'),
    direct: item.isDirect === true,
    inCommittedLockfile: lockedNames.has(name),
    inCommittedProductionGraph: lockedProductionNames.has(name),
    inFreshlyResolvedGraph: resolvedNames.has(name),
    inFreshlyResolvedProductionGraph: resolvedProductionNames.has(name),
    installedRange: String(item.range ?? ''),
    fixAvailable: fixLabel(item.fixAvailable),
    advisories: advisories(item),
  }
}).sort((a, b) => {
  const priority = (value) => {
    const i = severityOrder.indexOf(value)
    return i === -1 ? severityOrder.length : i
  }
  return priority(a.severity) - priority(b.severity) ||
    a.name.localeCompare(b.name)
})

const summary = {
  committedLockfile: {
    allDependencies: counts(lockedAll),
    omitDevDependencies: counts(lockedProduction),
  },
  freshlyResolvedLockfile: {
    allDependencies: counts(resolvedAll),
    omitDevDependencies: counts(resolvedProduction),
  },
  affectedPackages: rows,
  caveat: 'The ephemeral npm install --package-lock-only resolution approximates Railway npm install but may not reproduce the exact deployed node_modules. The Dockerfile currently copies all node_modules into the runtime image, including dev dependencies.',
}
writeFileSync('audit/summary.json', JSON.stringify(summary, null, 2) + '\n')

const csvHeader = [
  'package', 'severity', 'direct', 'committed_all', 'committed_production',
  'resolved_all', 'resolved_production', 'installed_range',
  'fix_available', 'advisory_urls',
]
const csvRows = rows.map((row) => [
  row.name, row.severity, row.direct,
  row.inCommittedLockfile, row.inCommittedProductionGraph,
  row.inFreshlyResolvedGraph, row.inFreshlyResolvedProductionGraph,
  row.installedRange, row.fixAvailable,
  row.advisories.map((item) => item.url).join(' '),
].map(csvCell).join(','))
writeFileSync('audit/affected-packages.csv',
  [csvHeader.join(','), ...csvRows].join('\n') + '\n')

const lockAll = counts(lockedAll)
const lockProd = counts(lockedProduction)
const freshAll = counts(resolvedAll)
const freshProd = counts(resolvedProduction)
const lines = [
  '## Read-only dependency audit',
  '',
  '| Severity | Committed all | Committed omit=dev | Resolved all | Resolved omit=dev |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...severityOrder.map((level) =>
    '| ' + level + ' | ' + lockAll[level] + ' | ' + lockProd[level] +
    ' | ' + freshAll[level] + ' | ' + freshProd[level] + ' |',
  ),
  '| **Total** | **' + lockAll.total + '** | **' + lockProd.total +
    '** | **' + freshAll.total + '** | **' + freshProd.total + '** |',
  '',
  'Vulnerability findings do not fail the job; invalid registry responses do.',
  '',
  '**Important:** npm install --package-lock-only runs on an isolated copy of the manifests and does not install or execute project dependencies. The resolved lockfile is a dependency-graph estimate, not proof of the exact Railway runtime dependency tree.',
  '',
  '**Runtime caveat:** The Dockerfile copies all node_modules into the image, including development dependencies.',
  '',
  '### Affected packages',
  '',
  '| Package | Severity | Committed | Resolved | Resolved production graph | Direct | Suggested fix |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) =>
    '| ' + markdownCell(row.name) +
    ' | ' + markdownCell(row.severity) +
    ' | ' + (row.inCommittedLockfile ? 'yes' : 'no') +
    ' | ' + (row.inFreshlyResolvedGraph ? 'yes' : 'no') +
    ' | ' + (row.inFreshlyResolvedProductionGraph ? 'yes' : 'no') +
    ' | ' + (row.direct ? 'yes' : 'no') +
    ' | ' + markdownCell(row.fixAvailable) + ' |',
  ),
  '',
  'Raw JSON reports, both lockfile snapshots, package-level metadata and CSV are in the dependency-audit-reports artifact.',
  '',
]
const markdown = lines.join('\n')
writeFileSync('audit/summary.md', markdown)
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
}
console.log('Read-only audit comparison validated.')
console.log('Committed:', JSON.stringify(lockAll), JSON.stringify(lockProd))
console.log('Freshly resolved:', JSON.stringify(freshAll), JSON.stringify(freshProd))
