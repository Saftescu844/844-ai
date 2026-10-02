import type { Payload } from 'payload'
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  FlashAi,
  Surse,
} from '@/payload-types'

import {
  buildFlashSourceRetrievalPlanReadOnly,
} from '@/lib/flash/runtimeEvidence/payloadSourceRetrievalPlan'

type FlashPayloadReader =
  Pick<
    Payload,
    'findByID' | 'find'
  >

function flash(
  surseFlash:
    FlashAi['surseFlash'],
): FlashAi {
  return {
    id: 77,
    surseFlash,
  } as unknown as FlashAi
}

function source(
  overrides:
    Partial<Surse> = {},
): Surse {
  return {
    id: 10,
    nume: 'Example Source',
    url:
      'https://example.com',
    activa: true,
    allowIngestion: true,
    allowAutoPublish: true,
    editorialTrust: 'high',
    sourceRole: 'primary',
    citationMode:
      'paraphrase',
    ...overrides,
  } as unknown as Surse
}

function reader(
  flashDoc: FlashAi,
  sourceDocs:
    Surse[] = [],
): {
  payload:
    FlashPayloadReader

  findByID:
    ReturnType<typeof vi.fn>

  find:
    ReturnType<typeof vi.fn>
} {
  const findByID =
    vi.fn(
      async () =>
        flashDoc,
    )

  const find =
    vi.fn(
      async () => ({
        docs:
          sourceDocs,
      }),
    )

  return {
    payload: {
      findByID,
      find,
    } as unknown as
      FlashPayloadReader,

    findByID,
    find,
  }
}

describe(
  'Flash Payload source retrieval plan read-only',
  () => {
    it(
      'returns empty plan when Flash has no source rows',
      async () => {
        const {
          payload,
          find,
        } =
          reader(
            flash([]),
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(result)
          .toEqual({
            flashId: 77,
            totalRows: 0,
            retrieveCount: 0,
            skipCount: 0,
            items: [],
          })

        expect(find)
          .not
          .toHaveBeenCalled()
      },
    )

    it(
      'builds retrieval input for active ingestion-enabled source',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/article',
                primary: true,
              },
            ]),
            [
              source(),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(result)
          .toMatchObject({
            flashId: 77,
            totalRows: 1,
            retrieveCount: 1,
            skipCount: 0,
          })

        expect(
          result.items[0],
        ).toEqual({
          rowIndex: 0,
          rowId: 'row-1',
          sourceId: 10,
          action: 'retrieve',
          skipReason: null,
          retrievalInput: {
            id: 'row-1',
            registeredSourceUrl:
              'https://example.com',
            concreteUrl:
              'https://example.com/article',
          },
        })
      },
    )

    it(
      'does not block retrieval when allowAutoPublish is false',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/article',
              },
            ]),
            [
              source({
                allowAutoPublish:
                  false,
              }),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0]
            .action,
        ).toBe(
          'retrieve',
        )
      },
    )

    it(
      'does not block retrieval for restricted editorial trust',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/article',
              },
            ]),
            [
              source({
                editorialTrust:
                  'restricted',
              }),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0]
            .action,
        ).toBe(
          'retrieve',
        )
      },
    )

    it(
      'skips source when ingestion is disabled',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/article',
              },
            ]),
            [
              source({
                allowIngestion:
                  false,
              }),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0],
        ).toMatchObject({
          action: 'skip',
          skipReason:
            'ingestion_disabled',
          retrievalInput:
            null,
        })

        expect(
          result.retrieveCount,
        ).toBe(0)

        expect(
          result.skipCount,
        ).toBe(1)
      },
    )

    it(
      'skips inactive source',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/article',
              },
            ]),
            [
              source({
                activa: false,
              }),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0]
            .skipReason,
        ).toBe(
          'source_inactive',
        )
      },
    )

    it(
      'skips row without source relation',
      async () => {
        const {
          payload,
          find,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: null,
                url:
                  'https://example.com/article',
              },
            ]),
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0]
            .skipReason,
        ).toBe(
          'missing_source_relation',
        )

        expect(find)
          .not
          .toHaveBeenCalled()
      },
    )

    it(
      'skips row when registered source document is missing',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 99,
                url:
                  'https://example.com/article',
              },
            ]),
            [],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0],
        ).toMatchObject({
          sourceId: 99,
          action: 'skip',
          skipReason:
            'source_not_found',
        })
      },
    )

    it(
      'accepts populated relation and uses deterministic fallback id',
      async () => {
        const {
          payload,
        } =
          reader(
            flash([
              {
                sursa: {
                  id: 10,
                } as Surse,
                url:
                  'https://example.com/article',
              },
            ]),
            [
              source(),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.items[0]
            .retrievalInput,
        ).toMatchObject({
          id: '77:0',
          registeredSourceUrl:
            'https://example.com',
          concreteUrl:
            'https://example.com/article',
        })
      },
    )

    it(
      'queries unique registered source ids once',
      async () => {
        const {
          payload,
          find,
        } =
          reader(
            flash([
              {
                id: 'row-1',
                sursa: 10,
                url:
                  'https://example.com/a',
              },
              {
                id: 'row-2',
                sursa: 10,
                url:
                  'https://example.com/b',
              },
            ]),
            [
              source(),
            ],
          )

        const result =
          await buildFlashSourceRetrievalPlanReadOnly(
            payload,
            77,
          )

        expect(
          result.retrieveCount,
        ).toBe(2)

        expect(find)
          .toHaveBeenCalledTimes(1)

        expect(find)
          .toHaveBeenCalledWith({
            collection:
              'surse',
            depth: 0,
            limit: 1,
            overrideAccess:
              true,
            where: {
              id: {
                in: [10],
              },
            },
          })
      },
    )
  },
)
