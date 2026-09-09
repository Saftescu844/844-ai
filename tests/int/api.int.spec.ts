import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

describe('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'useri',
    })
    expect(users).toBeDefined()
  })

  it('protects Flash Engine run audit writes behind overrideAccess', async () => {
    const runId = `flash-engine-runs-access-test:${Date.now()}`

    const data = {
      flashIdSnapshot: 999999999,
      runId,
      status: 'running' as const,
      provider: 'integration-test',
      model: 'none',
      engineVersion: 'integration-test-v1',
      startedAt: new Date().toISOString(),
    }

    await expect(
      payload.create({
        collection: 'flash-engine-runs',
        data,
        overrideAccess: false,
      }),
    ).rejects.toBeDefined()

    let createdId: number | null = null

    try {
      const created = await payload.create({
        collection: 'flash-engine-runs',
        data,
        overrideAccess: true,
      })

      createdId = created.id

      expect(created.runId).toBe(runId)
      expect(created.status).toBe('running')
      expect(created.flashIdSnapshot).toBe(999999999)
    } finally {
      if (createdId !== null) {
        await payload.delete({
          collection: 'flash-engine-runs',
          id: createdId,
          overrideAccess: true,
        })
      }

      const remaining = await payload.find({
        collection: 'flash-engine-runs',
        where: {
          runId: {
            equals: runId,
          },
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      expect(remaining.totalDocs).toBe(0)
    }
  })
})
