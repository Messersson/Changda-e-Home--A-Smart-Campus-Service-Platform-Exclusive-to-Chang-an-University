const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
    this.currentDate = this.getDateString();
    this.logFile = path.join(this.logDir, `app-${this.currentDate}.log`);
    this.errorLogFile = path.join(this.logDir, `error-${this.currentDate}.log`);
    this.maxLogSize = 5 * 1024 * 1024; // 5MB
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  getTimeString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  formatMessage(level, message, meta = {}) {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
    return `[${this.getTimeString()}] [${level}] ${message} ${metaStr}`;
  }

  writeToFile(filePath, message) {
    try {
      this.ensureDateFresh();

      // rotate if file exceeds max size
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.size >= this.maxLogSize) {
            const bakName = `${filePath}.${Date.now()}`;
            fs.renameSync(filePath, bakName);
          }
        }
      } catch (e) {
        // ignore rotation errors but log to console
        console.error('日志轮换失败:', e && e.message);
      }

      fs.appendFileSync(filePath, message + '\n', 'utf8');
    } catch (error) {
      console.error('写入日志文件失败:', error && error.message);
    }
  }

  ensureDateFresh() {
    const today = this.getDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.logFile = path.join(this.logDir, `app-${this.currentDate}.log`);
      this.errorLogFile = path.join(this.logDir, `error-${this.currentDate}.log`);
    }
  }

  info(message, meta = {}) {
    const formattedMessage = this.formatMessage('INFO', message, meta);
    console.log(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
  }

  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage('WARN', message, meta);
    console.warn(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
  }

  error(message, meta = {}) {
    const formattedMessage = this.formatMessage('ERROR', message, meta);
    console.error(formattedMessage);
    this.writeToFile(this.logFile, formattedMessage);
    this.writeToFile(this.errorLogFile, formattedMessage);
  }

  debug(message, meta = {}) {
    const formattedMessage = this.formatMessage('DEBUG', message, meta);
    if (process.env.NODE_ENV === 'development') {
      console.log(formattedMessage);
    }
    this.writeToFile(this.logFile, formattedMessage);
  }

  logRequest(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logData = {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      };
      
      if (res.statusCode >= 500) {
        this.error('HTTP请求失败', logData);
      } else if (res.statusCode >= 400) {
        this.warn('HTTP请求警告', logData);
      } else {
        this.info('HTTP请求成功', logData);
      }
    });
    
    next();
  }

  logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      ...context
    };
    this.error('应用错误', errorData);
  }

  cleanOldLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = new Date();
      
      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24);
        
        if (fileAge > daysToKeep) {
          fs.unlinkSync(filePath);
          this.info(`已删除旧日志文件: ${file}`);
        }
      });
    } catch (error) {
      this.error('清理旧日志文件失败', { error: error.message });
    }
  }
}

module.exports = new Logger();
