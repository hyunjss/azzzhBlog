import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const reportDirectory = process.argv[2] ?? 'lighthouse-reports'

const budgets = [
  { key: 'performance', label: 'Performance', unit: 'score', min: 90 },
  { key: 'accessibility', label: 'Accessibility', unit: 'score', min: 95 },
  { key: 'bestPractices', label: 'Best Practices', unit: 'score', min: 95 },
  { key: 'seo', label: 'SEO', unit: 'score', min: 95 },
  { key: 'lcp', label: 'LCP', unit: 'seconds', max: 2500 },
  { key: 'cls', label: 'CLS', unit: 'cls', max: 0.1 },
  { key: 'tbt', label: 'TBT', unit: 'milliseconds', max: 200 },
]

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

function auditValue(report, auditId) {
  const value = report.audits?.[auditId]?.numericValue
  return Number.isFinite(value) ? value : null
}

function scoreValue(report, categoryId) {
  const value = report.categories?.[categoryId]?.score
  return Number.isFinite(value) ? value * 100 : null
}

function format(value, unit) {
  if (value === null) return '—'
  if (unit === 'score') return `${value.toFixed(1)}%`
  if (unit === 'seconds') return `${(value / 1000).toFixed(2)} s`
  if (unit === 'cls') return value.toFixed(3)
  return `${Math.round(value)} ms`
}

const metricDefinitions = [
  { key: 'performance', label: 'Performance', unit: 'score', category: 'performance' },
  { key: 'accessibility', label: 'Accessibility', unit: 'score', category: 'accessibility' },
  { key: 'bestPractices', label: 'Best Practices', unit: 'score', category: 'best-practices' },
  { key: 'seo', label: 'SEO', unit: 'score', category: 'seo' },
  { key: 'lcp', label: 'LCP', unit: 'seconds', audit: 'largest-contentful-paint' },
  { key: 'cls', label: 'CLS', unit: 'cls', audit: 'cumulative-layout-shift' },
  { key: 'tbt', label: 'TBT', unit: 'milliseconds', audit: 'total-blocking-time' },
  { key: 'fcp', label: 'FCP', unit: 'seconds', audit: 'first-contentful-paint' },
  { key: 'speedIndex', label: 'Speed Index', unit: 'seconds', audit: 'speed-index' },
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
      values: Object.fromEntries(metricDefinitions.map(({ key, category, audit }) => [
        key,
        category ? scoreValue(report, category) : auditValue(report, audit),
      ])),
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
    values: Object.fromEntries(metricDefinitions.map(({ key: metricKey }) => [
      metricKey,
      median(entries.map((entry) => entry.values[metricKey])),
    ])),
  })
}

const homepagePath = '/azzzhBlog/'
const baseline = summaries.get(`main:${homepagePath}`)
const featureHomepage = summaries.get(`pr:${homepagePath}`)

if (!baseline || !featureHomepage) {
  throw new Error('Expected three-run Lighthouse results for both main and PR homepage URLs.')
}

const featureSummaries = [...summaries.values()].filter((summary) => summary.target === 'pr')
const failures = []
for (const summary of featureSummaries) {
  if (summary.runs !== 3) {
    failures.push(`${summary.pathname}: expected 3 Lighthouse runs, received ${summary.runs}`)
  }
  for (const budget of budgets) {
    const value = summary.values[budget.key]
    if (value === null) {
      failures.push(`${summary.pathname}: ${budget.label} metric is missing`)
    } else if (budget.min !== undefined && value < budget.min) {
      failures.push(`${summary.pathname}: ${budget.label} ${format(value, budget.unit)} is below ${format(budget.min, budget.unit)}`)
    } else if (budget.max !== undefined && value > budget.max) {
      failures.push(`${summary.pathname}: ${budget.label} ${format(value, budget.unit)} exceeds ${format(budget.max, budget.unit)}`)
    }
  }
}

console.log('## Lighthouse performance and quality summary')
console.log('')
console.log('Median of three Lighthouse runs per URL. PR pages are checked against the budgets below; main is measured as the homepage baseline.')
console.log('')
console.log('| Target | URL | Runs | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | FCP | Speed Index |')
console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')

const ordered = [...summaries.values()].sort((a, b) => {
  if (a.pathname === homepagePath && b.pathname !== homepagePath) return a.target === 'main' ? -1 : 1
  if (b.pathname === homepagePath && a.pathname !== homepagePath) return b.target === 'main' ? 1 : -1
  return a.target.localeCompare(b.target) || a.pathname.localeCompare(b.pathname)
})

for (const summary of ordered) {
  const cells = metricDefinitions.map(({ key, unit }) => format(summary.values[key], unit))
  console.log(`| ${summary.target === 'main' ? 'main baseline' : 'PR'} | ${summary.pathname} | ${summary.runs} | ${cells.join(' | ')} |`)
}

console.log('')
console.log('### PR Lighthouse budgets')
console.log('')
console.log('| Metric | Required median |')
console.log('| --- | ---: |')
for (const budget of budgets) {
  const threshold = budget.min !== undefined ? `≥ ${format(budget.min, budget.unit)}` : `≤ ${format(budget.max, budget.unit)}`
  console.log(`| ${budget.label} | ${threshold} |`)
}
console.log('')
console.log(`Budget result: ${failures.length === 0 ? 'PASS' : 'FAIL'}`)
if (failures.length > 0) {
  console.error('\nLighthouse budget violations:\n- ' + failures.join('\n- '))
  process.exitCode = 1
}

console.log('')
console.log('### Homepage change (PR minus main baseline)')
console.log('')
console.log('| Metric | main baseline | PR | Difference |')
console.log('| --- | ---: | ---: | ---: |')

for (const { key, label, unit } of metricDefinitions) {
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
