import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  buildStructuredRuntimeEvent,
  serializeStructuredRuntimeEvent,
} from '@/lib/observability/structuredRuntimeEvent'

describe(
  'structured runtime observability event',
  () => {
    it(
      'builds a stable correlation-friendly event',
      () => {
        const event =
          buildStructuredRuntimeEvent(
            {
              event:
                'flash.engine.run-next',

              component:
                'flash-engine-run-next-cli',

              status:
                'success',

              correlationId:
                ' flash-engine-job:81 ',

              data: {
                jobId:
                  '81',

                flashId:
                  7,

                executed:
                  true,

                omitted:
                  undefined,
              },
            },
            () =>
              new Date(
                '2026-09-28T17:30:00.000Z',
              ),
          )

        expect(
          event,
        ).toEqual({
          schemaVersion:
            1,

          timestamp:
            '2026-09-28T17:30:00.000Z',

          level:
            'info',

          event:
            'flash.engine.run-next',

          component:
            'flash-engine-run-next-cli',

          status:
            'success',

          correlationId:
            'flash-engine-job:81',

          data: {
            jobId:
              '81',

            flashId:
              7,

            executed:
              true,
          },
        })
      },
    )

    it(
      'defaults failed events to error level without requiring a correlation ID',
      () => {
        const serialized =
          serializeStructuredRuntimeEvent(
            {
              event:
                'flash.engine.enqueue',

              component:
                'flash-engine-enqueue-cli',

              status:
                'failed',

              data: {
                errorCode:
                  'FLASH_ENGINE_ENQUEUE_FAILED',
              },
            },
            () =>
              new Date(
                '2026-09-28T17:31:00.000Z',
              ),
          )

        expect(
          JSON.parse(
            serialized,
          ),
        ).toEqual({
          schemaVersion:
            1,

          timestamp:
            '2026-09-28T17:31:00.000Z',

          level:
            'error',

          event:
            'flash.engine.enqueue',

          component:
            'flash-engine-enqueue-cli',

          status:
            'failed',

          data: {
            errorCode:
              'FLASH_ENGINE_ENQUEUE_FAILED',
          },
        })
      },
    )

    it(
      'rejects blank event identity fields',
      () => {
        expect(
          () =>
            buildStructuredRuntimeEvent({
              event:
                '   ',

              component:
                'worker',

              status:
                'success',
            }),
        ).toThrow(
          'Missing required event',
        )

        expect(
          () =>
            buildStructuredRuntimeEvent({
              event:
                'flash.engine.run',

              component:
                '   ',

              status:
                'success',
            }),
        ).toThrow(
          'Missing required component',
        )
      },
    )
  },
)
