import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import connectionManager from './connectionManager'

const DEFAULT_TIMEOUT = 30000
const DEFAULT_RETRY = 2
const DEFAULT_RETRY_DELAY = 1000
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]
const REQUEST_EXPIRE_MS = 5 * 60 * 1000

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: DEFAULT_TIMEOUT
})

const pendingRequests = new Map()

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  if (Array.isArray(payload)) {
    return payload.map(normalizePayload)
  }

  return Object.keys(payload)
    .sort()
    .reduce((result, key) => {
      if (key === '_t' || typeof payload[key] === 'undefined') {
        return result
      }

      result[key] = normalizePayload(payload[key])
      return result
    }, {})
}

function generateRequestKey(config) {
  return [
    config.method,
    config.url,
    JSON.stringify(normalizePayload(config.params || {})),
    JSON.stringify(normalizePayload(config.data || {}))
  ].join('&')
}

function cleanupPendingRequest(config) {
  const requestKey = config?.metadata?.requestKey || (config ? generateRequestKey(config) : null)

  if (requestKey) {
    pendingRequests.delete(requestKey)
  }
}

function getRetryOptions(config = {}) {
  return {
    retry: Number.isInteger(config.retry) ? config.retry : DEFAULT_RETRY,
    retryDelay: config.retryDelay || DEFAULT_RETRY_DELAY,
    retryableStatusCodes: config.retryableStatusCodes || RETRYABLE_STATUS_CODES
  }
}

request.interceptors.request.use(
  (config) => {
    const requestKey = generateRequestKey(config)

    if (!config.skipDedup && pendingRequests.has(requestKey)) {
      const duplicateError = new Error('重复请求已拦截')
      duplicateError.isDuplicateRequest = true
      return Promise.reject(duplicateError)
    }

    config.metadata = {
      startedAt: Date.now(),
      requestKey
    }

    const retryOptions = getRetryOptions(config)
    config.retry = retryOptions.retry
    config.retryDelay = retryOptions.retryDelay
    config.retryableStatusCodes = retryOptions.retryableStatusCodes
    config.__retryCount = config.__retryCount || 0

    pendingRequests.set(requestKey, config.metadata.startedAt)

    try {
      const userStore = useUserStore()
      if (!config.skipAuth && userStore?.token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${userStore.token}`
      }
    } catch (error) {
      console.warn('读取用户状态失败:', error)
    }

    if (config.method?.toLowerCase() === 'get' && config.disableCache !== false) {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => {
    cleanupPendingRequest(response.config)

    const { data } = response
    if (typeof data?.success === 'undefined' || data.success) {
      return data
    }

    ElMessage.error(data.message || '请求失败')
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  async (error) => {
    if (error.isDuplicateRequest) {
      return Promise.reject(error)
    }

    const config = error.config
    cleanupPendingRequest(config)

    if (config?.silent) {
      return Promise.reject(error)
    }

    if (!error.response && error.message?.includes('Network Error')) {
      const reconnected = await connectionManager.ensureConnection()
      if (reconnected && config) {
        return request(config)
      }
    }

    if (
      config &&
      config.__retryCount < config.retry &&
      (config.retryableStatusCodes.includes(error.response?.status) || error.code === 'ECONNABORTED')
    ) {
      config.__retryCount += 1

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(request(config))
        }, config.retryDelay * config.__retryCount)
      })
    }

    if (error.response) {
      const { status } = error.response

      if (status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        try {
          const userStore = useUserStore()
          userStore.logout()
          router.push('/login')
        } catch (logoutError) {
          console.warn('清理登录态失败:', logoutError)
        }
      } else if (status === 403) {
        ElMessage.error(error.response.data?.message || '没有操作权限')
      } else if (status === 404) {
        ElMessage.error('请求资源不存在')
      } else if (status === 408) {
        ElMessage.error('请求超时，请稍后重试')
      } else if (status >= 500) {
        ElMessage.error(error.response.data?.message || '服务器暂时不可用')
      } else {
        ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络设置')
    } else {
      ElMessage.error('请求配置错误')
    }

    return Promise.reject(error)
  }
)

request.cancelAll = function cancelAll() {
  pendingRequests.clear()
}

request.cancelRequest = function cancelRequest(config) {
  cleanupPendingRequest(config)
}

setInterval(() => {
  const now = Date.now()

  pendingRequests.forEach((startedAt, key) => {
    if (now - startedAt > REQUEST_EXPIRE_MS) {
      pendingRequests.delete(key)
    }
  })
}, 60000)

export default request
