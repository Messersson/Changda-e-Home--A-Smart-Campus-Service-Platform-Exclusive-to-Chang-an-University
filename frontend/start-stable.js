import { exec, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FrontendServer {
  constructor() {
    this.server = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.uptime = 0;
    this.startTime = null;
  }

  start() {
    console.log('========================================');
    console.log('正在启动长安大学校园服务平台前端服务');
    console.log('========================================');
    
    this.startTime = new Date();
    
    // 使用spawn而不是exec，以便更好地控制进程
    this.server = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: true
    });

    this.server.on('error', (error) => {
      console.error('❌ 启动前端服务失败:', error.message);
      this.handleRestart();
    });

    this.server.on('exit', (code, signal) => {
      console.log(`\n========================================`);
      console.log(`前端服务退出，状态码: ${code}, 信号: ${signal}`);
      console.log(`========================================`);
      
      if (code !== 0 && this.restartCount < this.maxRestarts) {
        this.handleRestart();
      } else if (this.restartCount >= this.maxRestarts) {
        console.error('❌ 达到最大重启次数，停止自动重启');
      } else {
        console.log('✅ 前端服务正常退出');
      }
    });

    this.server.on('spawn', () => {
      console.log('✅ 前端服务进程已启动');
      this.uptime = 0;
      this.startMonitoring();
    });
  }

  handleRestart() {
    this.restartCount++;
    console.log(`🔄 正在重启前端服务 (${this.restartCount}/${this.maxRestarts})...`);
    
    // 延迟重启，避免快速连续重启
    setTimeout(() => {
      this.start();
    }, 2000);
  }

  startMonitoring() {
    // 每5分钟打印一次服务状态
    setInterval(() => {
      this.uptime = Math.floor((Date.now() - this.startTime) / 1000);
      const uptimeStr = this.formatUptime(this.uptime);
      console.log(`📊 前端服务运行状态: 已运行 ${uptimeStr}, 重启次数: ${this.restartCount}`);
    }, 300000);
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  }

  stop() {
    if (this.server) {
      console.log('🛑 正在停止前端服务...');
      this.server.kill('SIGINT');
      this.server = null;
    }
  }
}

// 启动前端服务
const frontendServer = new FrontendServer();
frontendServer.start();

// 处理进程信号
process.on('SIGINT', () => {
  console.log('\n📡 收到终止信号，正在停止前端服务...');
  frontendServer.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n📡 收到终止信号，正在停止前端服务...');
  frontendServer.stop();
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error.message);
  console.error(error.stack);
  // 不退出进程，让服务器继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  // 不退出进程，让服务器继续运行
});

console.log('✅ 前端服务管理器已启动');
console.log('📝 按 Ctrl+C 停止服务');
