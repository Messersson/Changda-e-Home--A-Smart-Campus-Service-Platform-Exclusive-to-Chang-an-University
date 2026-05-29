import { beforeEach, describe, expect, test, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: requestMock
}))

import { authApi, publicApi } from '@/api'

describe('login and guest APIs', () => {
  beforeEach(() => {
    Object.values(requestMock).forEach((method) => method.mockReset())
  })

  test('reads guest access without authentication', () => {
    publicApi.getGuestAccess()

    expect(requestMock.get).toHaveBeenCalledWith('/public/guest-access', { skipAuth: true })
  })

  test('logs in without attaching an existing token', () => {
    const payload = { studentId: '2024000000', password: 'admin123' }

    authApi.login(payload)

    expect(requestMock.post).toHaveBeenCalledWith('/auth/login', payload, {
      skipAuth: true,
      skipDedup: true
    })
  })
})
