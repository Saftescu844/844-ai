import { evaluateEditorialSelection } from '../src/lib/flash/ingestion/editorialSelection'
import { EDITORIAL_SELECTION_PILOT } from '../src/lib/flash/ingestion/editorialSelectionPilot'

const args = process.argv.slice(2)
if (args.length && !(args.length === 1 && args[0] === '--help')) {
  console.error('Unknown option. Use --help. No database, provider or network options are supported.')
  process.exitCode = 1
} else if (args[0] === '--help') {
  console.log('Offline human-reviewed MIT pilot: node --import tsx scripts/flash-editorial-selection-preview.ts')
} else {
  console.log(JSON.stringify({ status: 'offline_human_reviewed_pilot_not_runtime',
    results: EDITORIAL_SELECTION_PILOT.map(item => ({ key: item.key, url: item.url,
      assessment: evaluateEditorialSelection(item.input) })) }, null, 2))
}
