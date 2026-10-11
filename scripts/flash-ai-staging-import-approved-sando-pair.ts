import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import type { Payload } from 'payload'

import {
  buildVerifiedFlashEditorialLexicalContent,
  extractFlashEditorialParagraphs,
} from '@/lib/flash/editorialContentLexical'
import {
  normalizeFlashHtmlArticleCandidate,
} from '@/lib/flash/ingestion/articleCandidateNormalization'
import {
  evaluateFlashArticlePersistenceReadiness,
} from '@/lib/flash/ingestion/articleCandidatePersistenceReadiness'
import {
  buildFlashArticleCandidateFingerprints,
} from '@/lib/flash/ingestion/articleCandidateSourceFingerprint'
import {
  parseApprovedSandoEditorial,
  isApprovedSandoSourceRegistry,
  SANDO_APPROVED_ARTICLE_URL,
  SANDO_APPROVED_CLASSIFICATION,
  SANDO_APPROVED_EVENT_FINGERPRINT,
  SANDO_APPROVED_IEEE_URL,
  SANDO_APPROVED_MANUSCRIPTS,
  SANDO_APPROVED_SOURCE_FINGERPRINT,
  SANDO_APPROVED_SOURCE_ID,
  type SandoApprovedLanguage,
} from '@/lib/flash/ingestion/approvedSandoEditorial'
import {
  evaluateExplicitGroundedEventIdentity,
} from '@/lib/flash/ingestion/explicitGroundedEventIdentity'
import {
  buildFlashAiStagingWriteInput,
  type FlashAiStagingWriteInput,
} from '@/lib/flash/ingestion/flashAiStagingWriteInput'
import {
  assertFlashAiStagingWriteAllowed,
} from '@/lib/flash/ingestion/flashAiStagingWriteGuard'
import {
  buildFlashGroundedEventFingerprint,
} from '@/lib/flash/ingestion/groundedEventFingerprint'
import {
  extractFlashHtmlArticle,
} from '@/lib/flash/ingestion/htmlArticleExtraction'
import {
  createFlashAiAtomicReviewPair,
} from '@/lib/flash/ingestion/payloadFlashAiAtomicReviewPairWriter'
import {
  evaluateFlashArticlePrePersistenceDedupReadOnly,
} from '@/lib/flash/ingestion/payloadArticleCandidatePrePersistenceDedupReadOnly'
import {
  retrieveFlashSource,
} from '@/lib/flash/runtimeEvidence/sourceRetriever'
import {
  evaluateFlashSourceVerification,
} from '@/lib/flash/runtimeEvidence/sourceVerificationEvidence'

const STAGING_RAILWAY_PROJECT = '44c37d0f-b300-4462-b001-31259ddae5dd'
const STAGING_RAILWAY_ENV = 'a589dc28-1c59-468c-9eb4-351fce8fa17b'
const STAGING_PREVIEW_SERVICE = '7be51b73-dc87-4a53-9ad4-879c00aecad6'
const WRITE_FLAG = '--allow-staging-sando-pair-write'

function assertStagingExecutionTarget(env: NodeJS.ProcessEnv): void {
  if (
    env.RAILWAY_PROJECT_ID !== STAGING_RAILWAY_PROJECT ||
    env.RAILWAY_ENVIRONMENT_ID !== STAGING_RAILWAY_ENV ||
    env.RAILWAY_SERVICE_ID !== STAGING_PREVIEW_SERVICE ||
    env.PAYLOAD_DB_PUSH !== 'false'
  ) {
    throw new Error('SANDO approved import is limited to the dedicated Railway staging preview service.')
  }
  // The guard rejects the production Supabase database in BOTH dry-run
  // and write modes; it does not itself perform any write operation.
  assertFlashAiStagingWriteAllowed({
    allowWrite: true,
    databaseUrl: env.DATABASE_URL,
  })
}

async function loadApprovedManuscript(language: SandoApprovedLanguage) {
  const path = SANDO_APPROVED_MANUSCRIPTS[language].path
  const markdown = await readFile(resolve(process.cwd(), path), 'utf8')
  return parseApprovedSandoEditorial(language, markdown)
}

async function getPayloadInstance(): Promise<Payload> {
  const [payloadModule, configModule] = await Promise.all([
    import('payload'),
    import('@payload-config'),
  ])
  return payloadModule.getPayload({ config: configModule.default })
}

/**
 * A human-approved exception to AI-generation/AI-QA; it is NOT an AI
 * quality review pass. Exact manuscript hashes and the owner's prior
 * editorial approval are required. The deterministic word/lexical/DB gates
 * still apply, and no content is regenerated.
 */
async function main() {
  const args = process.argv.slice(2)
  if (args.length === 1 && ['--help', '-h'].includes(args[0] ?? '')) {
    console.log(
      'SANDO RO+EN import (default: read-only). ' +
      'Only after separate approval, pass --allow-staging-sando-pair-write ' +
      'on the dedicated Railway staging preview service. ' +
      'Reads byte-pinned approved markdown; no AI or publication.',
    )
    return
  }
  if (args.some(a => a !== WRITE_FLAG) || args.length > 1) {
    throw new Error('Unrecognized or repeated SANDO import argument.')
  }
  const writeRequested = args.includes(WRITE_FLAG)

  assertStagingExecutionTarget(process.env)

  const [roManuscript, enManuscript] = await Promise.all([
    loadApprovedManuscript('ro'),
    loadApprovedManuscript('en'),
  ])

  const payload = await getPayloadInstance()
  const found = await payload.find({
    collection: 'surse',
    depth: 0,
    overrideAccess: true,
    limit: 1,
    where: {
      and: [
        { id: { equals: SANDO_APPROVED_SOURCE_ID } },
        { activa: { equals: true } },
      ],
    },
  })
  const source = found.docs[0]
  if (!isApprovedSandoSourceRegistry(source)) {
    throw new Error('SANDO source registry or allowed pillar changed; refusing import.')
  }

  const retrieval = await retrieveFlashSource({
    id: 'flash-approved-sando-pair:source-6',
    registeredSourceUrl: source.url,
    concreteUrl: SANDO_APPROVED_ARTICLE_URL,
  })
  const sourceVerification = evaluateFlashSourceVerification([{
    id: 'source:6',
    registeredSourceUrl: source.url,
    concreteUrl: SANDO_APPROVED_ARTICLE_URL,
    finalUrl: retrieval.candidate.finalUrl,
    retrieved: retrieval.candidate.retrieved,
    contentAvailable: retrieval.candidate.contentAvailable,
  }])
  if (
    !sourceVerification.sourceVerificationPassed ||
    !retrieval.candidate.retrieved ||
    !retrieval.candidate.contentAvailable ||
    !retrieval.textContent
  ) {
    throw new Error('SANDO original MIT article is no longer verifiable.')
  }

  const extracted = extractFlashHtmlArticle(
    source.url,
    retrieval.candidate.finalUrl ?? SANDO_APPROVED_ARTICLE_URL,
    retrieval.textContent,
  )
  const candidate = normalizeFlashHtmlArticleCandidate({
    sourceId: source.id,
    sourceName: source.nume,
    registeredSourceUrl: source.url,
    sourceRole: source.sourceRole,
    editorialTrust: source.editorialTrust,
    citationMode: source.citationMode,
    allowAutoPublish: false,
  }, extracted)

  if (
    candidate.canonicalUrl !== SANDO_APPROVED_ARTICLE_URL ||
    candidate.sourcePublicationDate !== '2026-10-07'
  ) {
    throw new Error('SANDO source URL/date changed after editorial approval.')
  }

  const fingerprints = buildFlashArticleCandidateFingerprints(candidate)
  const identity = evaluateExplicitGroundedEventIdentity(candidate)
  if (
    identity.status !== 'grounded' ||
    identity.identity?.authority !== 'ieee-xplore' ||
    identity.identity.stableId !== '11714300' ||
    !retrieval.textContent.includes('SANDO')
  ) {
    throw new Error(`SANDO grounded IEEE identity ${SANDO_APPROVED_IEEE_URL} was not verified.`)
  }
  const eventFingerprint = buildFlashGroundedEventFingerprint(identity.identity).eventFingerprint

  if (
    fingerprints.sourceFingerprint !== SANDO_APPROVED_SOURCE_FINGERPRINT ||
    eventFingerprint !== SANDO_APPROVED_EVENT_FINGERPRINT
  ) {
    throw new Error('SANDO source/event fingerprint changed; editorial reapproval is required.')
  }

  const buildApprovedInput = async (
    language: SandoApprovedLanguage,
    approved: typeof roManuscript,
  ): Promise<FlashAiStagingWriteInput> => {
    const dedup = await evaluateFlashArticlePrePersistenceDedupReadOnly(
      payload,
      candidate,
      {
        eventFingerprint,
        sourceFingerprint: fingerprints.sourceFingerprint,
        targetLanguage: language,
      },
    )
    if (
      dedup.evidence.sourceDuplicateFound ||
      dedup.evidence.eventFingerprintDuplicateFound ||
      dedup.evidence.finalDedupPending ||
      dedup.evidence.sourceFingerprintReviewSignal ||
      dedup.evidence.titleReviewSignal
    ) {
      throw new Error(`SANDO ${language.toUpperCase()} duplicate/review evidence prevents the import.`)
    }
    const lexicalContent = buildVerifiedFlashEditorialLexicalContent(
      approved.editorial.editorialParagraphs,
    )
    const readiness = evaluateFlashArticlePersistenceReadiness({
      candidate,
      sourceVerification,
      dedup: dedup.evidence,
      sourceFingerprint: fingerprints.sourceFingerprint,
      eventFingerprint,
      targetLanguage: language,
      validatedClassification: SANDO_APPROVED_CLASSIFICATION,
      verifiedEditorial: {
        editorial: approved.editorial,
        lexicalContent,
      },
    })

    const input = buildFlashAiStagingWriteInput({ candidate, readiness })
    const roundTrip = extractFlashEditorialParagraphs(input.projection.continut)
    if (
      !readiness.canCreateFlashAiDraft ||
      roundTrip.length !== approved.editorial.editorialParagraphs.length ||
      roundTrip.some((p, index) => p !== approved.editorial.editorialParagraphs[index])
    ) {
      throw new Error('SANDO approved editorial failed the no-mutation Lexical handoff.')
    }

    // The normal generator derives an excerpt from the lead paragraph.
    // This one-off, human-approved pair preserves the approved excerpts
    // exactly; no body, safety metadata or source field is modified.
    input.projection.excerpt = approved.excerpt
    return input
  }

  const [ro, en] = await Promise.all([
    buildApprovedInput('ro', roManuscript),
    buildApprovedInput('en', enManuscript),
  ])
  if (
    ro.projection.sourceFingerprint !== en.projection.sourceFingerprint ||
    ro.projection.eventFingerprint !== en.projection.eventFingerprint ||
    ro.projection.pilon !== 1 ||
    en.projection.pilon !== 1 ||
    ro.projection.flashType !== 'research' ||
    en.projection.flashType !== 'research' ||
    ro.projection._status !== 'draft' ||
    en.projection._status !== 'draft'
  ) {
    throw new Error('SANDO RO and EN are not one consistent safe draft pair.')
  }

  if (!writeRequested) {
    console.log('FLASH_SANDO_APPROVED_PAIR_DRY_RUN_OK')
    console.log({
      writeAttempted: false,
      roWords: roManuscript.wordCount,
      enWords: enManuscript.wordCount,
      roExcerpt: ro.projection.excerpt.length,
      enExcerpt: en.projection.excerpt.length,
      sourceFingerprint: fingerprints.sourceFingerprint,
      eventFingerprint,
      dedupVerified: true,
      target: 'staging-only',
    })
    return
  }

  // Explicit flag + prior editorial consent are independent prerequisites.
  // Atomic writer rechecks dedup for BOTH languages before beginTransaction,
  // creates both, links both, marks review/draft and rolls back on failure.
  const result = await createFlashAiAtomicReviewPair({ payload, ro, en })
  console.log('FLASH_SANDO_APPROVED_PAIR_WRITE_OK')
  console.log({
    roId: result.roId,
    enId: result.enId,
    eventFingerprint: result.eventFingerprint,
    editorialStatus: 'review',
    payloadStatus: 'draft',
    publicationAttempted: false,
  })
}

main().then(() => process.exit(0)).catch(error => {
  console.error('FLASH_SANDO_APPROVED_PAIR_FAILED')
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
