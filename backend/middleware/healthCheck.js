const connectionManager = require('../database/connectionManager');
const logger = require('../utils/logger');

class HealthChecker {
  constructor() {
    this.checkInterval = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
    this.alertThreshold = {
      databaseFailure: 3,
      slowQuery: 5,
      highErrorRate: 0.1
    };
  }

  async checkDatabaseHealth() {
    try {
      const health = await connectionManager.getHealthStatus();
      return {
        status: health.status,
        connected: health.connected,
        poolInfo: health.poolInfo,
        stats: health.stats
      };
    } catch (error) {
      logger.error('[健康检查] 数据库健康检查失败:', { message: error.message });
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkServerHealth() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      pid: process.pid
    };
  }

  async performFullHealthCheck() {
    const startTime = Date.now();
    
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {}
    };

    try {
      results.checks.database = await this.checkDatabaseHealth();
      results.checks.server = await this.checkServerHealth();
      
      if (results.checks.database.status !== 'healthy') {
        results.overall = 'unhealthy';
      }
      
      if (results.checks.server.memory.heapUsed > 500) {
        results.overall = 'degraded';
        logger.warn('[健康检查] 服务器内存使用过高:', results.checks.server.memory);
      }
      
      const checkTime = Date.now() - startTime;
      results.checkTime = `${checkTime}ms`;
      
      this.recordHealthCheck(results);
      
      return results;
    } catch (error) {
      logger.error('[健康检查] 全面健康检查失败:', { message: error.message });
      return {
        timestamp: new Date().toISOString(),
        overall: 'unhealthy',
        error: error.message
      };
    }
  }

  recordHealthCheck(result) {
    this.healthHistory.push(result);
    
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
    
    this.checkAlerts(result);
  }

  checkAlerts(result) {
    if (result.checks.database?.status === 'unhealthy') {
      const recentFailures = this.healthHistory
        .slice(-this.alertThreshold.databaseFailure)
        .filter(h => h.checks.database?.status === 'unhealthy').length;
      
      if (recentFailures >= this.alertThreshold.databaseFailure) {
        logger.error('[健康检查] 数据库连续失败告警!', { 
          failures: recentFailures,
          threshold: this.alertThreshold.databaseFailure
        });
      }
    }
    
    if (result.checks.database?.stats?.failedQueries > 0) {
      const stats = result.checks.database.stats;
      const errorRate = stats.failedQueries / stats.totalQueries;
      
      if (errorRate > this.alertThreshold.highErrorRate) {
        logger.warn('[健康检查] 数据库错误率过高:', { 
          errorRate: (errorRate * 100).toFixed(2) + '%',
          threshold: (this.alertThreshold.highErrorRate * 100).toFixed(2) + '%'
        });
      }
    }
    
    if (result.checks.database?.stats?.averageQueryTime > 1000) {
      logger.warn('[健康检查] 数据库查询平均时间过长:', { 
        avgTime: result.checks.database.stats.averageQueryTime + 'ms',
        threshold: '1000ms'
      });
    }
  }

  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(-limit);
  }

  getHealthStats() {
    if (this.healthHistory.length === 0) {
      return null;
    }
    
    const recent = this.healthHistory.slice(-50);
    const healthyCount = recent.filter(h => h.overall === 'healthy').length;
    const degradedCount = recent.filter(h => h.overall === 'degraded').length;
    const unhealthyCount = recent.filter(h => h.overall === 'unhealthy').length;
    
    return {
      totalChecks: recent.length,
      healthyRate: (healthyCount / recent.length * 100).toFixed(2) + '%',
      degradedRate: (degradedCount / recent.length * 100).toFixed(2) + '%',
      unhealthyRate: (unhealthyCount / recent.length * 100).toFixed(2) + '%',
      recentChecks: recent.slice(-10)
    };
  }

  startPeriodicCheck(interval = 60000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(async () => {
      try {
        const result = await this.performFullHealthCheck();
        logger.debug('[健康检查] 定期检查完成:', { 
          overall: result.overall,
          checkTime: result.checkTime
        });
      } catch (error) {
        logger.error('[健康检查] 定期检查失败:', { message: error.message });
      }
    }, interval);
    
    logger.info(`[健康检查] 定期检查已启动 (每${interval/1000}秒)`);
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('[健康检查] 定期检查已停止');
    }
  }
}

module.exports = new HealthChecker();
