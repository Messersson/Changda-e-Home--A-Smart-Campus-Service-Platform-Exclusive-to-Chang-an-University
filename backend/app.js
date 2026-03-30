require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const DatabaseAdapter = require('./database/adapter');
const logger = require('./utils/logger');
const healthChecker = require('./middleware/healthCheck');
const monitor = require('./utils/monitor');

const authRoutes = require('./routes/auth');
const snackRoutes = require('./routes/snack');
const supermarketRoutes = require('./routes/supermarket');
const tutorRoutes = require('./routes/tutor');
const secondhandRoutes = require('./routes/secondhand');
const drivingSchoolRoutes = require('./routes/drivingSchool');
const studyMaterialRoutes = require('./routes/studyMaterial');
const forumRoutes = require('./routes/forum');
const adminRoutes = require('./routes/admin');

const PORT = Number(process.env.PORT) || 3000;
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS) || 60000;
const JSON_LIMIT = process.env.JSON_LIMIT || '10mb';
const HEALTH_CHECK_INTERVAL = Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 60000;
const MONITOR_INTERVAL = Number(process.env.MONITOR_INTERVAL_MS) || 60000;
const MEMORY_WARN_MB = Number(process.env.MEMORY_WARN_MB) || 100;
const CLUSTER_ENABLED = process.env.CLUSTER_ENABLED === 'true';
const CPU_COUNT = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
const IS_PRIMARY = typeof cluster.isPrimary === 'boolean' ? cluster.isPrimary : cluster.isMaster;

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;

  if (!rawOrigins || rawOrigins.trim() === '*') {
    return '*';
  }

  return rawOrigins
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCorsOptions() {
  const origins = getAllowedOrigins();
  const useCredentials = Array.isArray(origins);

  return {
    origin(origin, callback) {
      if (!origin || origins === '*' || origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: useCredentials,
    maxAge: 86400
  };
}

function startCluster() {
  if (!CLUSTER_ENABLED || !IS_PRIMARY) {
    return false;
  }

  logger.info('Primary process starting workers', { workers: CPU_COUNT });

  for (let index = 0; index < CPU_COUNT; index += 1) {
    cluster.fork();
  }

  cluster.on('online', (worker) => {
    logger.info('Worker online', { pid: worker.process.pid });
  });

  cluster.on('exit', (worker, code, signal) => {
    logger.error('Worker exited unexpectedly', {
      pid: worker.process.pid,
      code,
      signal
    });
    cluster.fork();
  });

  return true;
}

// helper function to build a fresh Express application instance
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use(logger.logRequest.bind(logger));

  app.use((req, res, next) => {
    req.setTimeout(REQUEST_TIMEOUT, () => {
      if (!res.headersSent) {
        res.status(408).json({ success: false, message: '请求超时，请稍后重试' })
      }
    })

    res.setTimeout(REQUEST_TIMEOUT)

    const startedAt = Date.now()
    res.on('finish', () => {
      monitor.trackRequest(startedAt, res.statusCode < 400, res.statusCode < 400 ? null : new Error(`HTTP ${res.statusCode}`))
    })

    next()
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/snack', snackRoutes)
  app.use('/api/supermarket', supermarketRoutes)
  app.use('/api/tutor', tutorRoutes)
  app.use('/api/secondhand', secondhandRoutes)
  app.use('/api/driving-school', drivingSchoolRoutes)
  app.use('/api/study-material', studyMaterialRoutes)
  app.use('/api/forum', forumRoutes)
  app.use('/api/admin', adminRoutes)

  app.get('/api/health', async (req, res) => {
    try {
      const health = await healthChecker.performFullHealthCheck()
      res.json({
        status: 'ok',
        message: '服务运行正常',
        health
      })
    } catch (error) {
      logger.error('Health endpoint failed', { message: error.message })
      res.status(503).json({
        status: 'unhealthy',
        error: error.message
      })
    }
  })

  app.get('/api/admin/health', async (req, res) => {
    try {
      const health = await healthChecker.performFullHealthCheck()
      const stats = healthChecker.getHealthStats()
      res.json({
        status: 'ok',
        message: '管理接口运行正常',
        health,
        stats
      })
    } catch (error) {
      logger.error('Admin health endpoint failed', { message: error.message })
      res.status(503).json({
        status: 'error',
        error: error.message
      })
    }
  })

  app.get('/api/admin/metrics', (req, res) => {
    try {
      res.json(monitor.getMetrics())
    } catch (error) {
      logger.error('Get metrics failed', { message: error.message })
      res.status(500).json({ error: error.message })
    }
  })

  app.get('/api/admin/alerts', (req, res) => {
    try {
      const limit = Number.parseInt(req.query.limit, 10) || 10
      res.json(monitor.getAlerts(limit))
    } catch (error) {
      logger.error('Get alerts failed', { message: error.message })
      res.status(500).json({ error: error.message })
    }
  })

  app.get('/api/admin/summary', (req, res) => {
    try {
      res.json(monitor.getSummary())
    } catch (error) {
      logger.error('Get summary failed', { message: error.message })
      res.status(500).json({ error: error.message })
    }
  })

  app.use((req, res) => {
    res.status(404).json({ success: false, message: '接口不存在' })
  })

  // global error handler
  app.use((err, req, res, next) => {
    logger.logError(err, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent')
    })

    if (res.headersSent) {
      next(err)
      return
    }

    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || '服务器内部错误，请稍后重试'
    })
  })

  return app;
}

// start the server when not in test mode and clustering is not enabled/primary
if (process.env.NODE_ENV !== 'test' && !startCluster()) {
  const app = createApp();
  let server;
  let memoryMonitor;
  let shuttingDown = false;

  server = app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
  // start monitor and schedule log cleanup
  try {
    monitor.startMonitoring(HEALTH_CHECK_INTERVAL);
  } catch (e) {
    logger.error('启动监控失败', { message: e.message });
  }

  // 清理旧日志（启动时）并每天运行一次
  try {
    logger.cleanOldLogs();
    setInterval(() => {
      try {
        logger.cleanOldLogs();
      } catch (e) {
        logger.error('定期清理日志失败', { message: e.message });
      }
    }, 24 * 60 * 60 * 1000);
  } catch (e) {
    logger.error('初始化日志清理失败', { message: e.message });
  }

  // 全局未捕获错误处理
  process.on('uncaughtException', (err) => {
    logger.logError(err, { fatal: true });
    // give logger time to flush then exit
    setTimeout(() => process.exit(1), 500);
  });

  process.on('unhandledRejection', (reason) => {
    try {
      logger.error('Unhandled Rejection', { reason: reason && (reason.message || reason) });
    } catch (e) {
      console.error('记录未处理的拒绝失败', e && e.message);
    }
  });
}

// expose for tests
module.exports = { createApp, startCluster }
