import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  applyCommentCreateDefaults,
} from '../../src/lib/comments/comment-target'

describe('U14.7I comment create defaults', () => {
  it('forces author and moderation status for non-admin users', () => {
    expect(
      applyCommentCreateDefaults(
        {
          continut: 'test',
          autor: 999,
          status: 'aprobat',
        },
        {
          id: 6,
          rol: 'cititor',
        },
      ),
    ).toEqual({
      continut: 'test',
      autor: 6,
      status: 'asteptare',
    })
  })

  it('fills missing author and status for admin public submissions', () => {
    expect(
      applyCommentCreateDefaults(
        {
          continut: 'test',
          flash: 5,
          raspunsLa: 3,
        },
        {
          id: 1,
          rol: 'admin',
        },
      ),
    ).toEqual({
      continut: 'test',
      flash: 5,
      raspunsLa: 3,
      autor: 1,
      status: 'asteptare',
    })
  })

  it('preserves explicit admin author and status values', () => {
    expect(
      applyCommentCreateDefaults(
        {
          continut: 'test',
          autor: 6,
          status: 'aprobat',
        },
        {
          id: 1,
          rol: 'admin',
        },
      ),
    ).toEqual({
      continut: 'test',
      autor: 6,
      status: 'aprobat',
    })
  })
})
