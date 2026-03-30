const logger = require('./logger');
const connectionManager = require('../database/connectionManager');

class ConnectionMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      },
      database: {
        totalQueries: 0,
        successQueries: 0,
        failedQueries: 0,
        avgQueryTime: 0,
        connectionErrors: 0,
        reconnections: 0
      },
      errors: [],
      alerts: []
    };
    this.alertThresholds = {
      highErrorRate: 0.1,
      slowResponse: 3000,
      highMemoryUsage: 500,
      highCpuUsage: 80,
      manyConnectionErrors: 5
    };
    this.monitorInterval = null;
    this.startTime = Date.now();
  }

  startMonitoring(interval = 60000) {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    
    this.monitorInterval = setInterval(() => {
      this.collectMetrics();
      this.checkThresholds();
      this.cleanupOldData();
    }, interval);
    
    logger.info(`[监控] 连接监控已启动 (每${interval/1000}秒)`);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('[监控] 连接监控已停止');
    }
  }

  collectMetrics() {
    const dbStats = connectionManager.getConnectionStats();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.metrics.database = {
      totalQueries: dbStats.totalQueries || 0,
      successQueries: dbStats.successfulQueries || 0,
      failedQueries: dbStats.failedQueries || 0,
      avgQueryTime: dbStats.averageQueryTime || 0,
      connectionErrors: dbStats.connectionErrors || 0,
      reconnections: dbStats.reconnections || 0
    };
    
    const totalRequests = this.metrics.requests.total;
    const successRequests = this.metrics.requests.success;
    const failedRequests = this.metrics.requests.failed;
    
    if (totalRequests > 0) {
      this.metrics.requests.successRate = (successRequests / totalRequests * 100).toFixed(2) + '%';
      this.metrics.requests.errorRate = (failedRequests / totalRequests * 100).toFixed(2) + '%';
    }
    
    if (this.metrics.database.totalQueries > 0) {
      this.metrics.database.querySuccessRate = 
        (this.metrics.database.successQueries / this.metrics.database.totalQueries * 100).toFixed(2) + '%';
      this.metrics.database.queryErrorRate = 
        (this.metrics.database.failedQueries / this.metrics.database.totalQueries * 100).toFixed(2) + '%';
    }
    
    this.metrics.system = {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };
    
    logger.debug('[监控] 指标收集完成', this.metrics);
  }

  checkThresholds() {
    const metrics = this.metrics;
    const alerts = [];
    
    if (metrics.requests.errorRate && parseFloat(metrics.requests.errorRate) > this.alertThresholds.highErrorRate * 100) {
      alerts.push({
        type: 'error',
        level: 'warning',
        message: `请求错误率过高: ${metrics.requests.errorRate}`,
        threshold: `${(this.alertThresholds.highErrorRate * 100).toFixed(2)}%`
      });
    }
    
    if (metrics.requests.avgResponseTime > this.alertThresholds.slowResponse) {
      alerts.push({
        type: 'performance',
        level: 'warning',
        message: `平均响应时间过长: ${metrics.requests.avgResponseTime}ms`,
        threshold: `${this.alertThresholds.slowResponse}ms`
      });
    }
    
    if (metrics.database.queryErrorRate && parseFloat(metrics.database.queryErrorRate) > this.alertThresholds.highErrorRate * 100) {
      alerts.push({
        type: 'database',
        level: 'warning',
        message: `数据库查询错误率过高: ${metrics.database.queryErrorRate}`,
        threshold: `${(this.alertThresholds.highErrorRate * 100).toFixed(2)}%`
      });
    }
    
    if (metrics.database.avgQueryTime > this.alertThresholds.slowResponse) {
      alerts.push({
        type: 'database',
        level: 'warning',
        message: `数据库平均查询时间过长: ${metrics.database.avgQueryTime}ms`,
        threshold: `${this.alertThresholds.slowResponse}ms`
      });
    }
    
    if (metrics.database.connectionErrors > this.alertThresholds.manyConnectionErrors) {
      alerts.push({
        type: 'database',
        level: 'critical',
        message: `数据库连接错误过多: ${metrics.database.connectionErrors}`,
        threshold: this.alertThresholds.manyConnectionErrors
      });
    }
    
    if (metrics.system && parseFloat(metrics.system.memory.heapUsed) > this.alertThresholds.highMemoryUsage) {
      alerts.push({
        type: 'system',
        level: 'warning',
        message: `内存使用过高: ${metrics.system.memory.heapUsed}`,
        threshold: `${this.alertThresholds.highMemoryUsage}MB`
      });
    }
    
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        this.recordAlert(alert);
        logger.warn(`[监控] ${alert.level.toUpperCase()}: ${alert.message}`, alert);
      });
    }
  }

  recordAlert(alert) {
    alert.timestamp = new Date().toISOString();
    this.metrics.alerts.push(alert);
    
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts.shift();
    }
  }

  recordError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500),
      context: context
    };
    
    this.metrics.errors.push(errorRecord);
    
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
    
    logger.error('[监控] 错误记录', errorRecord);
  }

  cleanupOldData() {
    if (this.metrics.requests.responseTimes.length > 100) {
      this.metrics.requests.responseTimes = this.metrics.requests.responseTimes.slice(-100);
    }
    
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts = this.metrics.alerts.slice(-100);
    }
    
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
  }

  trackRequest(startTime, success = true, error = null) {
    const responseTime = Date.now() - startTime;
    
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.failed++;
      if (error) {
        this.recordError(error, { responseTime });
      }
    }
    
    this.metrics.requests.responseTimes.push(responseTime);
    
    if (this.metrics.requests.responseTimes.length > 100) {
      this.metrics.requests.responseTimes.shift();
    }
    
    const avgResponseTime = this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / 
                         this.metrics.requests.responseTimes.length;
    this.metrics.requests.avgResponseTime = Math.round(avgResponseTime);
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      startTime: new Date(this.startTime).toISOString()
    };
  }

  getAlerts(limit = 10) {
    return this.metrics.alerts.slice(-limit);
  }

  getErrors(limit = 10) {
    return this.metrics.errors.slice(-limit);
  }

  getSummary() {
    const metrics = this.getMetrics();
    
    return {
      uptime: `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`,
      requests: {
        total: metrics.requests.total,
        successRate: metrics.requests.successRate || 'N/A',
        avgResponseTime: `${metrics.requests.avgResponseTime}ms`
      },
      database: {
        totalQueries: metrics.database.totalQueries,
        querySuccessRate: metrics.database.querySuccessRate || 'N/A',
        avgQueryTime: `${metrics.database.avgQueryTime}ms`,
        reconnections: metrics.database.reconnections
      },
      system: {
        memory: metrics.system?.memory?.heapUsed || 'N/A',
        uptime: metrics.system?.uptime || 'N/A'
      },
      alerts: {
        total: metrics.alerts.length,
        recent: metrics.alerts.slice(-3)
      }
    };
  }

  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        failed: 0,
        avgResponseTime: 0,
        responseTimes: []
      },
      database: {
        totalQueries: 0,
        successQueries: 0,
        failedQueries: 0,
        avgQueryTime: 0,
        connectionErrors: 0,
        reconnections: 0
      },
      errors: [],
      alerts: []
    };
    this.startTime = Date.now();
    logger.info('[监控] 指标已重置');
  }
}

module.exports = new ConnectionMonitor();
