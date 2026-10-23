import { beforeEach, describe, expect, it, vi } from 'vitest'

const startMock = vi.fn()

vi.mock('@/mocks/browser', () => ({
  worker: {
    start: startMock,
  },
}))

vi.mock('@/config/env', () => ({
  env: {
    apiBaseUrl: 'http://localhost:8000/api/v1',
    enableMocks: true,
  },
}))

import { enableMocking } from './enable'

describe('enableMocking', () => {
  beforeEach(() => {
    startMock.mockReset()
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          { unregister: vi.fn().mockResolvedValue(undefined) },
        ]),
      },
      configurable: true,
    })
  })

  it('removes stale service workers before registering the MSW worker', async () => {
    await enableMocking()

    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceWorker: {
          url: '/mockServiceWorker.js',
          options: {
            scope: '/',
          },
        },
      }),
    )
  })
})
