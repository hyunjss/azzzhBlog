import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const reportDirectory = process.argv[2] ?? 'lighthouse-reports'

function findJsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return findJsonFiles(path)
    return entry.isFile() && entry.name.endsWith('.json') ? [path] : []
  })
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function metricValue(report, auditId) {
  const value = report.audits?.[auditId]?.numericValue
  return Number.isFinite(value) ? value : null
}

function format(value, unit) {
  if (value === null) return '—'
  if (unit === 'score') return `${value.toFixed(1)}%`
  if (unit === 'seconds') return `${(value / 1000).toFixed(2)} s`
  if (unit === 'cls') return value.toFixed(3)
  return `${Math.round(value)} ms`
}

const metrics = [
  { key: 'performance', label: 'Performance', unit: 'score' },
  { key: 'lcp', label: 'LCP', unit: 'seconds' },
  { key: 'cls', label: 'CLS', unit: 'cls' },
  { key: 'tbt', label: 'TBT', unit: 'milliseconds' },
  { key: 'fcp', label: 'FCP', unit: 'seconds' },
  { key: 'speedIndex', label: 'Speed Index', unit: 'seconds' },
]

const reports = findJsonFiles(reportDirectory).flatMap((path) => {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    const report = parsed.lighthouseResult ?? parsed
    if (!report.requestedUrl || !report.audits || !report.categories) return []

    const url = new URL(report.requestedUrl)
    const target = url.port === '4174' ? 'main' : url.port === '4173' ? 'pr' : null
    if (!target) return []

    return [{
      target,
      pathname: url.pathname,
      values: {
        performance: Number.isFinite(report.categories.performance?.score)
          ? report.categories.performance.score * 100
          : null,
        lcp: metricValue(report, 'largest-contentful-paint'),
        cls: metricValue(report, 'cumulative-layout-shift'),
        tbt: metricValue(report, 'total-blocking-time'),
        fcp: metricValue(report, 'first-contentful-paint'),
        speedIndex: metricValue(report, 'speed-index'),
      },
    }]
  } catch {
    return []
  }
})

if (reports.length === 0) {
  throw new Error(`No valid Lighthouse reports found in "${reportDirectory}".`)
}

const groups = new Map()
for (const report of reports) {
  const key = `${report.target}:${report.pathname}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(report)
}

const summaries = new Map()
for (const [key, entries] of groups) {
  const [target, pathname] = key.split(':')
  summaries.set(key, {
    target,
    pathname,
    runs: entries.length,
    values: Object.fromEntries(
      metrics.map(({ key: metricKey }) => [
        metricKey,
        median(entries.map((entry) => entry.values[metricKey])),
      ]),
    ),
  })
}

const homepagePath = '/azzzhBlog/'
const baseline = summaries.get(`main:${homepagePath}`)
const featureHomepage = summaries.get(`pr:${homepagePath}`)

if (!baseline || !featureHomepage) {
  throw new Error('Expected three-run Lighthouse results for both main and PR homepage URLs.')
}

console.log('## Lighthouse performance summary')
console.log('')
console.log('Median of three Lighthouse runs per URL. Lower is better for LCP, CLS, TBT, FCP, and Speed Index; higher is better for Performance.')
console.log('')
console.log('| Target | URL | Runs | Performance | LCP | CLS | TBT | FCP | Speed Index |')
console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')

const ordered = [...summaries.values()].sort((a, b) => {
  if (a.pathname === homepagePath && b.pathname !== homepagePath) return a.target === 'main' ? -1 : 1
  if (b.pathname === homepagePath && a.pathname !== homepagePath) return b.target === 'main' ? 1 : -1
  return a.target.localeCompare(b.target) || a.pathname.localeCompare(b.pathname)
})

for (const summary of ordered) {
  const cells = metrics.map(({ key, unit }) => format(summary.values[key], unit))
  console.log(`| ${summary.target === 'main' ? 'main baseline' : 'PR'} | ${summary.pathname} | ${summary.runs} | ${cells.join(' | ')} |`)
}

console.log('')
console.log('### Homepage change (PR minus main baseline)')
console.log('')
console.log('| Metric | main baseline | PR | Difference |')
console.log('| --- | ---: | ---: | ---: |')

for (const { key, label, unit } of metrics) {
  const before = baseline.values[key]
  const after = featureHomepage.values[key]
  const delta = before === null || after === null ? null : after - before
  let difference = '—'
  if (delta !== null) {
    if (unit === 'score') difference = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pp`
    else if (unit === 'seconds') difference = `${delta > 0 ? '+' : ''}${(delta / 1000).toFixed(2)} s`
    else if (unit === 'cls') difference = `${delta > 0 ? '+' : ''}${delta.toFixed(3)}`
    else difference = `${delta > 0 ? '+' : ''}${Math.round(delta)} ms`
  }
  console.log(`| ${label} | ${format(before, unit)} | ${format(after, unit)} | ${difference} |`)
}
