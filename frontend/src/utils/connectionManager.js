import axios from 'axios'
import { ElMessage } from 'element-plus'

class ConnectionManager {
  constructor() {
    this.isConnected = false
    this.lastCheckTime = null
    this.checkInterval = null
    this.initialized = false
    this.retryCount = 0
    this.maxRetries = 5
    this.retryDelay = 1000
    this.healthCheckUrl = `${import.meta.env.VITE_API_BASE_URL || '/api'}/health`
    this.connectionStatus = 'disconnected'
    this.listeners = []
  }

  init() {
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.startHealthCheck()
    this.setupNetworkListeners()
    this.checkConnection()
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[连接管理] 网络已恢复')
      ElMessage.success('网络连接已恢复')
      this.checkConnection()
    })

    window.addEventListener('offline', () => {
      console.log('[连接管理] 网络已断开')
      ElMessage.warning('网络连接已断开')
      this.connectionStatus = 'disconnected'
      this.notifyListeners('disconnected')
    })
  }

  async checkConnection() {
    try {
      const response = await axios.get(this.healthCheckUrl, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.status === 200) {
        this.isConnected = true
        this.connectionStatus = 'connected'
        this.retryCount = 0
        this.lastCheckTime = Date.now()
        console.log('[连接管理] 连接检查成功')
        this.notifyListeners('connected')
        return true
      }
    } catch (error) {
      this.isConnected = false
      this.connectionStatus = 'disconnected'
      console.error('[连接管理] 连接检查失败:', error.message)
      this.notifyListeners('disconnected')
      return false
    }
  }

  startHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }
    
    this.checkInterval = setInterval(async () => {
      await this.checkConnection()
    }, 30000)
    
    console.log('[连接管理] 健康检查已启动 (每30秒)')
  }

  stopHealthCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('[连接管理] 健康检查已停止')
    }
  }

  async ensureConnection() {
    if (this.isConnected) {
      return true
    }
    
    console.log('[连接管理] 尝试重新连接...')
    ElMessage.info('正在重新连接服务器...')
    
    for (let i = 0; i < this.maxRetries; i++) {
      const connected = await this.checkConnection()
      if (connected) {
        ElMessage.success('服务器连接已恢复')
        return true
      }
      
      await this.sleep(this.retryDelay * (i + 1))
    }
    
    ElMessage.error('无法连接到服务器，请检查网络设置')
    return false
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  addConnectionListener(callback) {
    this.listeners.push(callback)
  }

  removeConnectionListener(callback) {
    const index = this.listeners.indexOf(callback)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('[连接管理] 监听器执行失败:', error)
      }
    })
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      lastCheckTime: this.lastCheckTime,
      retryCount: this.retryCount
    }
  }

  async request(config) {
    const maxRetries = config.maxRetries || 3
    const retryDelay = config.retryDelay || 1000
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios({
          ...config,
          timeout: config.timeout || 30000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            ...config.headers
          }
        })
        return response.data
      } catch (error) {
        console.error(`[连接管理] 请求失败 (${i + 1}/${maxRetries}):`, error.message)
        
        if (i === maxRetries - 1) {
          throw error
        }
        
        await this.sleep(retryDelay * (i + 1))
      }
    }
  }
}

export default new ConnectionManager()
