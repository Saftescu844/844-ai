import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildFlashDecisionInput,
  getRequiredDisclaimerTypes,
  type FlashDecisionEvidence,
  type FlashDecisionRecord,
  type FlashDecisionSource,
} from '@/lib/flash/decisionInputAdapter'

import {
  evaluateFlashDecision,
} from '@/lib/flash/decisionEngine'

import {
  buildFlashRegulatoryStatusDecisionEvidence,
} from '@/lib/flash/runtimeEvidence/regulatoryStatusDecisionAdapter'

const baseEvidence =
  (): FlashDecisionEvidence => ({
    roComplete: true,
    enComplete: true,

    dedupPassed: true,
    sourceVerificationPassed: true,
    factsSupportedBySources: true,
    materialContradictions: false,
    engineCertain: true,

    safetyGateTriggered: false,
    importantMedicalInterpretation: false,
    extraordinaryClaimNeedsReview: false,
    regulatoryStatusUnclear: false,

    obviousDuplicate: false,
    unverifiableSources: false,
    fabricatedInformation: false,
    fabricatedCitations: false,

    individualDiagnosis: false,
    individualTreatmentRecommendation: false,
    medicationChange: false,
    dangerousInstructions: false,
    fundamentalEditorialViolation: false,
  })

const validFlash =
  (): FlashDecisionRecord => ({
    informationStatus: 'official',
    riskLevel: 'low',
    isHealthRelated: false,
    clinicalValidationStatus:
      'notApplicable',
    disclaimerTypes: [],
  })

const validSource =
  (): FlashDecisionSource => ({
    registered: true,
    active: true,
    hasConcreteURL: true,
    allowIngestion: true,
    allowAutoPublish: true,
    editorialTrust: 'high',
  })

describe(
  'Flash regulatory status decision adapter',
  () => {
    it(
      'maps irrelevant regulatory context to false',
      () => {
        const result =
          buildFlashRegulatoryStatusDecisionEvidence({
            regulatoryContextRelevant:
              false,
            findings: [],
          })

        expect(
          result.decisionEvidence,
        ).toEqual({
          regulatoryStatusUnclear:
            false,
        })
      },
    )

    it(
      'maps clear supported regulatory status to false',
      () => {
        const result =
          buildFlashRegulatoryStatusDecisionEvidence({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id: 'regulatory-1',
                type:
                  'approvalOrAuthorization',
                verdict:
                  'clear',
                evidenceRef:
                  'regulator:document-1',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .regulatoryStatusUnclear,
        ).toBe(false)
      },
    )

    it(
      'maps relevant context without status evidence to true',
      () => {
        const result =
          buildFlashRegulatoryStatusDecisionEvidence({
            regulatoryContextRelevant:
              true,
            findings: [],
          })

        expect(
          result
            .decisionEvidence
            .regulatoryStatusUnclear,
        ).toBe(true)
      },
    )

    it(
      'maps conflicting regulatory evidence to true',
      () => {
        const result =
          buildFlashRegulatoryStatusDecisionEvidence({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id: 'regulatory-2',
                type:
                  'jurisdictionApplicability',
                verdict:
                  'conflicting',
                evidenceRef:
                  'regulator:jurisdiction-1',
              },
            ],
          })

        expect(
          result
            .decisionEvidence
            .regulatoryStatusUnclear,
        ).toBe(true)
      },
    )

    it(
      'unclear regulatory status produces REVIEW and requires its disclaimer',
      () => {
        const regulatory =
          buildFlashRegulatoryStatusDecisionEvidence({
            regulatoryContextRelevant:
              true,

            findings: [
              {
                id:
                  'regulatory-review-1',
                type:
                  'approvedIndicationOrUse',
                verdict:
                  'unclear',
                evidenceRef:
                  'regulator:indication-1',
              },
            ],
          })

        const flash: FlashDecisionRecord = {
          ...validFlash(),

          disclaimerTypes: [
            'regulatoryStatusLimitedOrUnclear',
          ],
        }

        const evidence = {
          ...baseEvidence(),
          ...regulatory
            .decisionEvidence,
        }

        expect(
          getRequiredDisclaimerTypes(
            flash,
            evidence,
          ),
        ).toContain(
          'regulatoryStatusLimitedOrUnclear',
        )

        const input =
          buildFlashDecisionInput({
            flash,

            sources: [
              validSource(),
            ],

            evidence,
          })

        expect(
          evaluateFlashDecision(
            input,
          ),
        ).toEqual({
          decision: 'review',

          reasons: [
            'regulatory_status_unclear',
          ],
        })
      },
    )
  },
)
