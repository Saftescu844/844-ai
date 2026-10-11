import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

// npm audit is intentionally read-only. The JSON files come directly from
// the npm advisory service; no project packages or scripts are installed here.
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

const all = loadAudit('audit/all.json')
const production = loadAudit('audit/production-graph.json')
const productionNames = new Set(Object.keys(production.vulnerabilities))

const rows = Object.entries(all.vulnerabilities).map(([name, item]) => {
  const advisories = Array.isArray(item.via)
    ? item.via.filter((source) => source && typeof source === 'object')
      .map((source) => ({
        title: String(source.title ?? ''),
        url: String(source.url ?? ''),
        range: String(source.range ?? ''),
        severity: String(source.severity ?? ''),
      }))
    : []

  return {
    name,
    severity: String(item.severity ?? 'unknown'),
    direct: item.isDirect === true,
    inProductionDependencyGraph: productionNames.has(name),
    installedRange: String(item.range ?? ''),
    fixAvailable: fixLabel(item.fixAvailable),
    advisories,
  }
}).sort((a, b) =>
  severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) ||
  a.name.localeCompare(b.name),
)

const summary = {
  dependencySource: 'package-lock.json',
  allDependencies: counts(all),
  omitDevDependencies: counts(production),
  affectedPackages: rows,
  caveat: 'omit=dev describes the dependency graph, not the final Docker image: the Dockerfile currently copies all node_modules into its runtime image.',
}

writeFileSync('audit/summary.json', JSON.stringify(summary, null, 2) + '\n')

const csvHeader = [
  'package', 'severity', 'direct', 'in_production_dependency_graph',
  'installed_range', 'fix_available', 'advisory_urls',
]
const csvRows = rows.map((row) => [
  row.name, row.severity, row.direct,
  row.inProductionDependencyGraph, row.installedRange,
  row.fixAvailable, row.advisories.map((item) => item.url).join(' '),
].map(csvCell).join(','))
writeFileSync('audit/affected-packages.csv', [
  csvHeader.join(','), ...csvRows,
].join('\n') + '\n')

const full = counts(all)
const prod = counts(production)
const lines = [
  '## Read-only dependency audit',
  '',
  '| Severity | All dependencies | npm --omit=dev graph |',
  '| --- | ---: | ---: |',
  ...severityOrder.map((level) =>
    '| ' + level + ' | ' + full[level] + ' | ' + prod[level] + ' |',
  ),
  '| **Total** | **' + full.total + '** | **' + prod.total + '** |',
  '',
  'The audit is informational: vulnerabilities do not fail this job. Missing or malformed audit responses do fail it.',
  '',
  '**Important:** The current Dockerfile copies all node_modules into the runtime image. The --omit=dev column is a dependency-graph comparison, not proof that development dependencies are absent from the container.',
  '',
  '### Affected packages',
  '',
  '| Package | Severity | Production graph | Direct | Fix available |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((row) =>
    '| ' + markdownCell(row.name) +
    ' | ' + markdownCell(row.severity) +
    ' | ' + (row.inProductionDependencyGraph ? 'yes' : 'no') +
    ' | ' + (row.direct ? 'yes' : 'no') +
    ' | ' + markdownCell(row.fixAvailable) + ' |',
  ),
  '',
  'Full raw evidence, package advisories and CSV are in the dependency-audit-reports artifact.',
  '',
]
const markdown = lines.join('\n')
writeFileSync('audit/summary.md', markdown)
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
}

console.log('Read-only npm audit reports validated.')
console.log('Vulnerability counts:', JSON.stringify(full))
console.log('Production dependency graph:', JSON.stringify(prod))
