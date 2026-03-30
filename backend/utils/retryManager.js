const logger = require('./logger');

class RetryManager {
  constructor() {
    this.retryStrategies = new Map();
    this.defaultStrategy = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'EPIPE',
        'PROTOCOL_CONNECTION_LOST',
        'ER_CON_COUNT_ERROR',
        'ER_LOCK_DEADLOCK'
      ],
      retryableStatusCodes: [408, 429, 500, 502, 503, 504]
    };
  }

  registerStrategy(name, strategy) {
    this.retryStrategies.set(name, {
      ...this.defaultStrategy,
      ...strategy
    });
    logger.info(`[重试管理] 已注册策略: ${name}`);
  }

  getStrategy(name) {
    return this.retryStrategies.get(name) || this.defaultStrategy;
  }

  async executeWithRetry(fn, strategyName = 'default', context = {}) {
    const strategy = this.getStrategy(strategyName);
    let lastError;
    let attempt = 0;
    let totalDelay = 0;

    while (attempt <= strategy.maxRetries) {
      attempt++;
      
      try {
        const result = await fn();
        
        if (attempt > 1) {
          logger.info(`[重试管理] 操作成功 (尝试 ${attempt}/${strategy.maxRetries + 1})`, {
            strategy: strategyName,
            totalDelay: `${totalDelay}ms`
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        const isRetryable = this.isRetryable(error, strategy);
        
        if (!isRetryable || attempt > strategy.maxRetries) {
          logger.error(`[重试管理] 操作失败 (尝试 ${attempt}/${strategy.maxRetries + 1})`, {
            strategy: strategyName,
            error: error.message,
            code: error.code,
            isRetryable: isRetryable
          });
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, strategy);
        totalDelay += delay;
        
        logger.warn(`[重试管理] 操作失败，${delay}ms后重试 (尝试 ${attempt}/${strategy.maxRetries + 1})`, {
          strategy: strategyName,
          error: error.message,
          code: error.code,
          nextAttemptIn: `${delay}ms`,
          totalDelay: `${totalDelay}ms`
        });
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  isRetryable(error, strategy) {
    if (error.code && strategy.retryableErrors.includes(error.code)) {
      return true;
    }
    
    if (error.response && strategy.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }
    
    if (error.message && error.message.includes('timeout')) {
      return true;
    }
    
    if (error.message && error.message.includes('network')) {
      return true;
    }
    
    return false;
  }

  calculateDelay(attempt, strategy) {
    const exponentialDelay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    const delay = Math.min(exponentialDelay + jitter, strategy.maxDelay);
    return Math.round(delay);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeWithCircuitBreaker(fn, options = {}) {
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      halfOpenMaxCalls = 3
    } = options;

    if (!this.circuitBreakers) {
      this.circuitBreakers = new Map();
    }

    const key = fn.name || fn.toString().substring(0, 50);
    let breaker = this.circuitBreakers.get(key);

    if (!breaker) {
      breaker = {
        state: 'closed',
        failures: 0,
        lastFailureTime: null,
        halfOpenCalls: 0
      };
      this.circuitBreakers.set(key, breaker);
    }

    if (breaker.state === 'open') {
      const timeSinceFailure = Date.now() - breaker.lastFailureTime;
      
      if (timeSinceFailure >= resetTimeout) {
        breaker.state = 'half-open';
        breaker.halfOpenCalls = 0;
        logger.info(`[熔断器] ${key} 进入半开状态`);
      } else {
        const waitTime = resetTimeout - timeSinceFailure;
        logger.warn(`[熔断器] ${key} 处于开启状态，等待 ${waitTime}ms 后重试`);
        throw new Error(`Circuit breaker is open for ${key}. Retry in ${waitTime}ms.`);
      }
    }

    try {
      const result = await fn();
      
      if (breaker.state === 'half-open') {
        breaker.halfOpenCalls++;
        
        if (breaker.halfOpenCalls >= halfOpenMaxCalls) {
          breaker.state = 'closed';
          breaker.failures = 0;
          logger.info(`[熔断器] ${key} 恢复到关闭状态`);
        }
      } else {
        breaker.failures = 0;
      }
      
      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailureTime = Date.now();
      
      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
        logger.error(`[熔断器] ${key} 进入开启状态`, {
          failures: breaker.failures,
          threshold: failureThreshold
        });
      }
      
      throw error;
    }
  }

  getCircuitBreakerStatus() {
    const status = {};
    
    if (this.circuitBreakers) {
      this.circuitBreakers.forEach((breaker, key) => {
        status[key] = {
          state: breaker.state,
          failures: breaker.failures,
          lastFailureTime: breaker.lastFailureTime
        };
      });
    }
    
    return status;
  }

  resetCircuitBreaker(key) {
    if (this.circuitBreakers && this.circuitBreakers.has(key)) {
      const breaker = this.circuitBreakers.get(key);
      breaker.state = 'closed';
      breaker.failures = 0;
      breaker.lastFailureTime = null;
      breaker.halfOpenCalls = 0;
      logger.info(`[熔断器] ${key} 已重置`);
    }
  }

  resetAllCircuitBreakers() {
    if (this.circuitBreakers) {
      this.circuitBreakers.forEach((breaker, key) => {
        this.resetCircuitBreaker(key);
      });
    }
  }
}

module.exports = new RetryManager();
