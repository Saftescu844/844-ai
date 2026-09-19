import {
  describe,
  expect,
  it,
} from 'vitest'

import { Comentarii } from '../../src/collections/RestulColectiilor'
import {
  commentTargetWhere,
  resolveCommentTarget,
} from '../../src/lib/comments/comment-target'

type CommentField = {
  name?: string
  relationTo?: string
  required?: boolean
  filterOptions?: (args: {
    data?: Record<string, unknown>
    user?: { rol?: string } | null
  }) => unknown
}

function field(name: string): CommentField {
  const found =
    (Comentarii.fields as CommentField[])
      .find((candidate) => candidate.name === name)

  if (!found) {
    throw new Error(`Missing field: ${name}`)
  }

  return found
}

describe('FlashAI comment target contract', () => {
  it('accepts exactly one article target', () => {
    expect(
      resolveCommentTarget({
        articol: 12,
      }),
    ).toEqual({
      kind: 'articol',
      id: 12,
    })
  })

  it('accepts exactly one FlashAI target', () => {
    expect(
      resolveCommentTarget({
        flash: {
          id: 5,
        },
      }),
    ).toEqual({
      kind: 'flash',
      id: 5,
    })
  })

  it('rejects missing and dual targets', () => {
    expect(
      resolveCommentTarget({}),
    ).toBeNull()

    expect(
      resolveCommentTarget({
        articol: 12,
        flash: 5,
      }),
    ).toBeNull()
  })

  it('uses original target on partial updates and respects explicit null', () => {
    expect(
      resolveCommentTarget(
        {
          continut: 'actualizat',
        },
        {
          articol: 12,
        },
      ),
    ).toEqual({
      kind: 'articol',
      id: 12,
    })

    expect(
      resolveCommentTarget(
        {
          articol: null,
          flash: 5,
        },
        {
          articol: 12,
        },
      ),
    ).toEqual({
      kind: 'flash',
      id: 5,
    })
  })

  it('builds a same-target reply predicate', () => {
    expect(
      commentTargetWhere({
        kind: 'flash',
        id: 5,
      }),
    ).toEqual({
      flash: {
        equals: 5,
      },
    })
  })

  it('keeps article optional and adds optional FlashAI relation', () => {
    const articol = field('articol')
    const flash = field('flash')

    expect(articol.relationTo).toBe('articole')
    expect(articol.required).not.toBe(true)

    expect(flash.relationTo).toBe('flash-ai')
    expect(flash.required).not.toBe(true)
  })

  it('limits non-admin replies to approved comments on the same Flash', () => {
    const raspunsLa = field('raspunsLa')

    expect(
      raspunsLa.filterOptions?.({
        data: {
          flash: 5,
        },
        user: {
          rol: 'cititor',
        },
      }),
    ).toEqual({
      and: [
        {
          flash: {
            equals: 5,
          },
        },
        {
          status: {
            equals: 'aprobat',
          },
        },
      ],
    })
  })

  it('allows admin replies in the same Flash regardless of moderation state', () => {
    const raspunsLa = field('raspunsLa')

    expect(
      raspunsLa.filterOptions?.({
        data: {
          flash: 5,
        },
        user: {
          rol: 'admin',
        },
      }),
    ).toEqual({
      flash: {
        equals: 5,
      },
    })
  })

  it('fails closed when reply target is ambiguous', () => {
    const raspunsLa = field('raspunsLa')

    expect(
      raspunsLa.filterOptions?.({
        data: {
          articol: 12,
          flash: 5,
        },
        user: {
          rol: 'cititor',
        },
      }),
    ).toBe(false)
  })
})
