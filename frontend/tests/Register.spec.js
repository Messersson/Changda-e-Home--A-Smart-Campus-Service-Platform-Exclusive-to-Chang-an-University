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

import { adminApi, authApi } from '@/api'

describe('registration and admin management APIs', () => {
  beforeEach(() => {
    Object.values(requestMock).forEach((method) => method.mockReset())
  })

  test('submits merchant registration through the public endpoint', () => {
    const payload = {
      email: 'shop@example.com',
      code: '123456',
      password: 'secret123',
      name: '张三',
      phone: '13900000000',
      storeName: '校园小店',
      address: '东门'
    }

    authApi.merchantRegister(payload)

    expect(requestMock.post).toHaveBeenCalledWith('/auth/merchant-register', payload, { skipAuth: true })
  })

  test('maps admin user management and guest switch endpoints', () => {
    adminApi.addUser({ studentId: '2024000002' })
    adminApi.updateUser(3, { name: '新用户' })
    adminApi.deleteUser(3)
    adminApi.updateGuestAccess({ guestAccessEnabled: false })

    expect(requestMock.post).toHaveBeenCalledWith('/admin/users', { studentId: '2024000002' })
    expect(requestMock.put).toHaveBeenCalledWith('/admin/users/3', { name: '新用户' })
    expect(requestMock.delete).toHaveBeenCalledWith('/admin/users/3')
    expect(requestMock.put).toHaveBeenCalledWith('/admin/settings/guest-access', { guestAccessEnabled: false })
  })
})
