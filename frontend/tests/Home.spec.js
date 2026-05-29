import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const routerSource = readFileSync(resolve(process.cwd(), 'src/router/index.js'), 'utf8')

describe('guest route access', () => {
  test('public browsing routes do not require login', () => {
    expect(routerSource).toContain("name: 'Home'")
    expect(routerSource).toContain("meta: { requiresAuth: false, keepAlive: false }")
    expect(routerSource).toContain("name: 'Snack'")
    expect(routerSource).toContain("name: 'Supermarket'")
    expect(routerSource).toContain("name: 'Secondhand'")
    expect(routerSource).toContain("name: 'StudyMaterial'")
    expect(routerSource).toContain("meta: { title: '校园论坛', keepAlive: true, merchantAllowed: true }")
  })

  test('transactional routes still require login', () => {
    expect(routerSource).toContain("meta: { title: '我的订单', requiresAuth: true, keepAlive: true }")
    expect(routerSource).toContain("meta: { title: '家教板块', requiresAuth: true, keepAlive: true }")
    expect(routerSource).toContain("meta: { title: '驾校板块', requiresAuth: true, keepAlive: true }")
  })
})
