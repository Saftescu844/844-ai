import {
  execFile,
} from 'node:child_process'
import {
  readFile,
} from 'node:fs/promises'
import {
  resolve,
} from 'node:path'
import {
  promisify,
} from 'node:util'

import {
  describe,
  expect,
  it,
} from 'vitest'

const execFileAsync =
  promisify(
    execFile,
  )

const scriptPath =
  resolve(
    process.cwd(),
    'scripts/flash-verified-supporting-source-pack-preview.ts',
  )

describe(
  'Flash verified supporting-source pack preview CLI',
  () => {
    it(
      'documents explicit read-only retrieval, verification, and bounded semantic extraction without provider or persistence actions',
      async () => {
        const source =
          await readFile(
            scriptPath,
            'utf8',
          )

        expect(source).toContain(
          'FLASH_VERIFIED_SUPPORTING_SOURCE_PACK_PREVIEW_OK',
        )
        expect(source).toContain(
          "readOptions(\n      '--supporting-url',",
        )
        expect(source).toContain(
          'retrieveFlashSource',
        )
        expect(source).toContain(
          'evaluateFlashVerifiedSupportingSourcePack',
        )
        expect(source).toContain(
          'extractFlashSupportingPolicySemanticMaterial',
        )
        expect(source).toContain(
          'FLASH_MAX_SUPPORTING_SOURCES',
        )
        expect(source).toContain(
          'semanticTextLength:',
        )
        expect(source).toContain(
          'semanticWordCount:',
        )

        const retrievalIndex =
          source.indexOf(
            'const retrievals =',
          )
        const packIndex =
          source.indexOf(
            'const pack =',
          )
        const semanticIndex =
          source.indexOf(
            'const semanticMaterials =',
          )

        expect(
          retrievalIndex,
        ).toBeGreaterThanOrEqual(
          0,
        )
        expect(
          packIndex,
        ).toBeGreaterThan(
          retrievalIndex,
        )
        expect(
          semanticIndex,
        ).toBeGreaterThan(
          packIndex,
        )

        expect(source).not.toMatch(
          /payload\.(create|update|delete)\s*\(/,
        )
        expect(source).not.toMatch(
          /payload\.jobs\.(queue|run)\s*\(/,
        )
        expect(source).not.toContain(
          '@anthropic-ai/sdk',
        )
        expect(source).not.toContain(
          'runFlashPrePersistence',
        )
      },
    )

    it(
      'prints help before requiring Railway or Payload environment',
      async () => {
        const {
          stdout,
          stderr,
        } =
          await execFileAsync(
            process.execPath,
            [
              '--import',
              'tsx',
              'scripts/flash-verified-supporting-source-pack-preview.ts',
              '--help',
            ],
            {
              cwd:
                process.cwd(),
              env: {
                ...process.env,
                RAILWAY_PROJECT_ID: '',
                RAILWAY_ENVIRONMENT_ID: '',
                RAILWAY_SERVICE_ID: '',
                PAYLOAD_DB_PUSH: '',
              },
            },
          )

        expect(stderr).toBe('')
        expect(stdout).toContain(
          'Flash Engine verified supporting-source pack preview',
        )
        expect(stdout).toContain(
          '--supporting-url https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai',
        )
        expect(stdout).toContain(
          'requires one or two explicit --supporting-url values',
        )
        expect(stdout).toContain(
          'extracts deterministic bounded semantic material',
        )
        expect(stdout).toContain(
          'never the semantic body',
        )
        expect(stdout).toContain(
          'does NOT discover sources autonomously',
        )
        expect(stdout).toContain(
          'does NOT call any semantic provider',
        )
        expect(stdout).toContain(
          'does NOT create, update, or delete Payload documents',
        )
      },
    )
  },
)
