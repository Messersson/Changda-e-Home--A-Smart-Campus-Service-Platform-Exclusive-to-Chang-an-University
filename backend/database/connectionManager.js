﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');

class DatabaseConnectionManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectPromise = null;
    this.connectionChecker = null;
    this.healthCheckInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.connectionStats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      connectionErrors: 0,
      reconnections: 0,
      lastQueryTime: null,
      lastErrorTime: null,
      averageQueryTime: 0
    };
    this.queryTimes = [];
  }

  async connect() {
    if (this.isConnected && this.pool) {
      logger.info('[鏁版嵁搴揮 杩炴帴宸插瓨鍦紝澶嶇敤鐜版湁杩炴帴');
      return { connected: true };
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = (async () => {
      try {
        logger.info('[鏁版嵁搴揮 姝ｅ湪寤虹珛杩炴帴...');
        
        this.pool = mysql.createPool({
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'chd_campus',
          waitForConnections: true,
          connectionLimit: 25,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 0,
          maxIdle: 10,
          idleTimeout: 30000,
          connectTimeout: 10000,
          multipleStatements: false,
          namedPlaceholders: false,
          dateStrings: false,
          supportBigNumbers: true,
          bigNumberStrings: false,
          flags: '+MULTI_STATEMENTS,-FOUND_ROWS',
          ssl: false
        });

        const connection = await this.pool.getConnection();
        logger.info('[鏁版嵁搴揮 杩炴帴鑾峰彇鎴愬姛锛屾祴璇曡繛鎺?..');
        
        const [testResult] = await connection.query('SELECT 1 as test');
        logger.info('[鏁版嵁搴揮 杩炴帴娴嬭瘯鎴愬姛:', testResult);
        
        connection.release();
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        logger.info('[鏁版嵁搴揮 MySQL 杩炴帴姹犲垵濮嬪寲鎴愬姛');
        
        this.startConnectionChecker();
        this.startHealthCheck();
        this.startStatsCollector();
        
        return { connected: true };
      } catch (error) {
        logger.error('[鏁版嵁搴揮 MySQL 杩炴帴澶辫触:', { 
          message: error.message,
          code: error.code,
          errno: error.errno
        });
        this.connectionStats.connectionErrors++;
        this.connectionStats.lastErrorTime = new Date();
        throw error;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  startConnectionChecker() {
    if (this.connectionChecker) {
      clearInterval(this.connectionChecker);
    }
    
    this.connectionChecker = setInterval(async () => {
      try {
        if (this.isConnected && this.pool) {
          const connection = await this.pool.getConnection();
          const [result] = await connection.query('SELECT 1 as health');
          connection.release();
          
          if (result.length > 0) {
            logger.debug('[鏁版嵁搴揮 杩炴帴蹇冭烦姝ｅ父');
          }
        }
      } catch (error) {
        logger.error('[鏁版嵁搴揮 杩炴帴蹇冭烦澶辫触锛屾鍦ㄩ噸杩?', { message: error.message });
        this.isConnected = false;
        this.connectionStats.connectionErrors++;
        this.connectionStats.lastErrorTime = new Date();
        
        try {
          await this.reconnect();
          logger.info('[鏁版嵁搴揮 鑷姩閲嶈繛鎴愬姛');
        } catch (reconnectError) {
          logger.error('[鏁版嵁搴揮 鑷姩閲嶈繛澶辫触:', { message: reconnectError.message });
        }
      }
    }, 60000);
    
    logger.info('[鏁版嵁搴揮 杩炴帴蹇冭烦妫€鏌ュ凡鍚姩 (姣?0绉?');
  }

  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status === 'unhealthy') {
          logger.warn('[鏁版嵁搴揮 鏁版嵁搴撳仴搴锋鏌ュけ璐ワ紝灏濊瘯鎭㈠...');
          await this.reconnect();
        }
      } catch (error) {
        logger.error('[鏁版嵁搴揮 鍋ュ悍妫€鏌ュけ璐?', { message: error.message });
      }
    }, 120000);
    
    logger.info('[鏁版嵁搴揮 鍋ュ悍妫€鏌ュ凡鍚姩 (姣?鍒嗛挓)');
  }

  startStatsCollector() {
    setInterval(() => {
      logger.info('[鏁版嵁搴揮 杩炴帴缁熻:', this.connectionStats);
      this.queryTimes = [];
    }, 3600000);
  }

  stopConnectionChecker() {
    if (this.connectionChecker) {
      clearInterval(this.connectionChecker);
      this.connectionChecker = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[鏁版嵁搴揮 杈惧埌鏈€澶ч噸杩炴鏁帮紝鍋滄閲嶈繛');
      throw new Error('Database reconnection limit reached');
    }

    this.reconnectAttempts++;
    this.connectionStats.reconnections++;
    
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    
    logger.info(`[鏁版嵁搴揮 姝ｅ湪閲嶈繛 (${this.reconnectAttempts}/${this.maxReconnectAttempts})锛岀瓑寰?${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      if (this.pool) {
        await this.pool.end();
      }
      this.isConnected = false;
      await this.connect();
      logger.info('[鏁版嵁搴揮 閲嶈繛鎴愬姛');
      return { reconnected: true };
    } catch (error) {
      logger.error('[鏁版嵁搴揮 閲嶈繛澶辫触:', { message: error.message });
      throw error;
    }
  }

  async disconnect() {
    this.stopConnectionChecker();
    
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        logger.info('[鏁版嵁搴揮 MySQL 杩炴帴宸叉柇寮€');
        return { disconnected: true };
      } catch (error) {
        logger.error('[鏁版嵁搴揮 鏂紑杩炴帴澶辫触:', { message: error.message });
        throw error;
      }
    }
    
    return { disconnected: true };
  }

  async query(sql, params = [], retries = 3) {
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        logger.error('[鏁版嵁搴揮 鏃犳硶寤虹珛杩炴帴:', { message: error.message });
        throw error;
      }
    }

    this.connectionStats.totalQueries++;
    const startTime = Date.now();

    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.pool.query(sql, params);
        const queryTime = Date.now() - startTime;
        
        this.connectionStats.successfulQueries++;
        this.connectionStats.lastQueryTime = new Date();
        
        this.queryTimes.push(queryTime);
        if (this.queryTimes.length > 100) {
          this.queryTimes.shift();
        }
        
        const avgTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
        this.connectionStats.averageQueryTime = Math.round(avgTime);
        
        if (queryTime > 1000) {
          logger.warn('[鏁版嵁搴揮 鎱㈡煡璇㈣鍛?', { 
            sql: sql.substring(0, 100),
            time: `${queryTime}ms`,
            params: JSON.stringify(params).substring(0, 100)
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        this.connectionStats.failedQueries++;
        this.connectionStats.lastErrorTime = new Date();
        
        logger.error(`[鏁版嵁搴揮 鏌ヨ澶辫触 (${i + 1}/${retries}):`, { 
          message: error.message,
          code: error.code,
          sql: sql.substring(0, 100)
        });
        
        const connectionErrors = [
          'ER_CON_COUNT_ERROR', 
          'ER_ACCESS_DENIED_ERROR', 
          'PROTOCOL_CONNECTION_LOST',
          'ECONNREFUSED',
          'ER_BAD_DB_ERROR',
          'ER_DBACCESS_DENIED_ERROR',
          'ETIMEDOUT',
          'EPIPE'
        ];
        
        if (connectionErrors.includes(error.code)) {
          logger.error('[鏁版嵁搴揮 杩炴帴閿欒锛屾鍦ㄩ噸鏂拌繛鎺?..');
          this.isConnected = false;
          
          try {
            await this.reconnect();
            logger.info('[鏁版嵁搴揮 閲嶆柊杩炴帴鎴愬姛锛屾鍦ㄩ噸璇曟煡璇?..');
          } catch (reconnectError) {
            logger.error('[鏁版嵁搴揮 閲嶆柊杩炴帴澶辫触:', { message: reconnectError.message });
            if (i === retries - 1) {
              throw error;
            }
          }
        } else if (i === retries - 1) {
          logger.error('[鏁版嵁搴揮 鏌ヨ澶辫触:', { 
            sql: sql.substring(0, 100),
            params: JSON.stringify(params).substring(0, 100),
            error: error.message
          });
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  }

  async getHealthStatus() {
    try {
      const [result] = await this.pool.query('SELECT 1 as health');
      const poolInfo = await this.getPoolInfo();
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        poolInfo: poolInfo,
        stats: this.connectionStats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }

  async getPoolInfo() {
    if (!this.pool) {
      return null;
    }
    
    try {
      const connection = await this.pool.getConnection();
      const [result] = await connection.query('SHOW STATUS LIKE "Threads_connected"');
      const [result2] = await connection.query('SHOW STATUS LIKE "Max_used_connections"');
      connection.release();
      
      return {
        threadsConnected: result[0]?.Value || 0,
        maxUsedConnections: result2[0]?.Value || 0,
        poolConfig: {
          connectionLimit: this.pool.config.connectionLimit,
          queueLimit: this.pool.config.queueLimit
        }
      };
    } catch (error) {
      logger.error('[鏁版嵁搴揮 鑾峰彇杩炴帴姹犱俊鎭け璐?', { message: error.message });
      return null;
    }
  }

  getConnectionStats() {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async executeTransaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('[鏁版嵁搴揮 浜嬪姟鎵ц澶辫触:', { message: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new DatabaseConnectionManager();



