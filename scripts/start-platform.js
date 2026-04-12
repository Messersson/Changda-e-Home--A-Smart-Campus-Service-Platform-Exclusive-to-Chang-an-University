'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const launcherLogsDir = path.join(rootDir, 'logs', 'launcher');

const backendPort = 3000;
const frontendPorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];
const backendHealthUrl = `http://127.0.0.1:${backendPort}/api/health`;

const args = new Set(process.argv.slice(2));
const prefersHeadless = args.has('--headless');
const disableBrowser = args.has('--no-browser');
const startTimeoutMs = Number(process.env.PLATFORM_START_TIMEOUT_MS) || 90000;
const pollIntervalMs = 1500;
const isWindows = process.platform === 'win32';
const runInHeadlessMode = prefersHeadless || !isWindows;

function printBanner() {
  console.log('========================================');
  console.log('长安大学校园服务平台 - 一键启动');
  console.log('========================================');
  console.log('');
}

function log(message) {
  console.log(`[启动器] ${message}`);
}

function warn(message) {
  console.warn(`[启动器] ${message}`);
}

function fail(message) {
  console.error(`[启动器] ${message}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`缺少 ${label}：${path.relative(rootDir, filePath)}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function commandExists(commandName) {
  const lookupCommand = isWindows ? 'where.exe' : 'which';
  const result = spawnSync(lookupCommand, [commandName], { stdio: 'ignore' });
  return result.status === 0;
}

function ensureEnvironment() {
  ensureFileExists(path.join(backendDir, 'package.json'), '后端 package.json');
  ensureFileExists(path.join(frontendDir, 'package.json'), '前端 package.json');

  if (!commandExists('node')) {
    fail('未检测到 Node.js，请先安装并配置到 PATH。');
  }

  if (!commandExists(isWindows ? 'npm.cmd' : 'npm')) {
    fail('未检测到 npm，请确认 Node.js 安装完整。');
  }

  if (!fs.existsSync(path.join(backendDir, 'node_modules'))) {
    fail('后端依赖未安装，请先执行：cd backend && npm install');
  }

  if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
    fail('前端依赖未安装，请先执行：cd frontend && npm install');
  }

  if (!isWindows && !prefersHeadless) {
    warn('当前不是 Windows 环境，已自动切换为无弹窗启动模式。');
  }
}

function httpGet(url) {
  return new Promise((resolve) => {
    let settled = false;

    function finish(result) {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    }

    const request = http.get(url, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        finish({
          ok: true,
          statusCode: response.statusCode,
          body
        });
      });
    });

    request.setTimeout(2500, () => {
      request.destroy(new Error('timeout'));
    });

    request.on('error', (error) => {
      finish({
        ok: false,
        error
      });
    });
  });
}

function isProjectFrontendHtml(html) {
  if (typeof html !== 'string' || !html) {
    return false;
  }

  return html.includes('<div id="app"></div>') && html.includes('/src/main.js');
}

async function isBackendReady() {
  const result = await httpGet(backendHealthUrl);

  if (!result.ok || result.statusCode !== 200) {
    return false;
  }

  try {
    const payload = JSON.parse(result.body);
    return payload.status === 'ok';
  } catch (error) {
    return false;
  }
}

async function detectFrontendUrl() {
  for (const port of frontendPorts) {
    const url = `http://127.0.0.1:${port}`;
    const result = await httpGet(url);

    if (result.ok && result.statusCode === 200 && isProjectFrontendHtml(result.body)) {
      return url;
    }
  }

  return null;
}

function isTcpPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });

    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
  });
}

async function waitFor(checker, label) {
  const deadline = Date.now() + startTimeoutMs;

  while (Date.now() < deadline) {
    const result = await checker();
    if (result) {
      return result;
    }

    await sleep(pollIntervalMs);
  }

  fail(`${label}在 ${Math.floor(startTimeoutMs / 1000)} 秒内未就绪。`);
}

function toPowerShellLiteral(value) {
  return String(value).replace(/'/g, "''");
}

function openBrowser(url) {
  if (disableBrowser) {
    return;
  }

  if (isWindows) {
    const child = spawn('cmd.exe', ['/c', 'start', '', url], {
      cwd: rootDir,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    return;
  }

  if (process.platform === 'darwin') {
    const child = spawn('open', [url], { cwd: rootDir, stdio: 'ignore' });
    child.unref();
    return;
  }

  const child = spawn('xdg-open', [url], { cwd: rootDir, stdio: 'ignore' });
  child.unref();
}

function startGuiTerminal(title, cwd, heading, command) {
  const powerShellCommand = [
    `$Host.UI.RawUI.WindowTitle = '${toPowerShellLiteral(title)}'`,
    `Set-Location -LiteralPath '${toPowerShellLiteral(cwd)}'`,
    `Write-Host '========================================' -ForegroundColor Cyan`,
    `Write-Host '${toPowerShellLiteral(heading)}' -ForegroundColor Cyan`,
    `Write-Host '========================================' -ForegroundColor Cyan`,
    `Write-Host ''`,
    command
  ].join('; ');

  const child = spawn(
    'cmd.exe',
    ['/c', 'start', title, 'powershell.exe', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', powerShellCommand],
    {
      cwd: rootDir,
      stdio: 'ignore',
      windowsHide: false
    }
  );

  child.unref();
}

function startHeadlessProcess(cwd, command, stdoutFileName, stderrFileName) {
  ensureDir(launcherLogsDir);

  const stdoutPath = path.join(launcherLogsDir, stdoutFileName);
  const stderrPath = path.join(launcherLogsDir, stderrFileName);

  const stdoutFd = fs.openSync(stdoutPath, 'w');
  const stderrFd = fs.openSync(stderrPath, 'w');

  const child = spawn(
    isWindows ? 'cmd.exe' : 'sh',
    isWindows ? ['/d', '/s', '/c', command] : ['-lc', command],
    {
      cwd,
      detached: true,
      stdio: ['ignore', stdoutFd, stderrFd],
      windowsHide: true
    }
  );

  child.unref();

  return {
    pid: child.pid,
    stdoutPath,
    stderrPath
  };
}

async function startBackend() {
  const alreadyRunning = await isBackendReady();
  if (alreadyRunning) {
    log('检测到后端已经在运行，直接复用现有服务。');
    return;
  }

  const occupied = await isTcpPortOpen(backendPort);
  if (occupied) {
    fail(`端口 ${backendPort} 已被其他程序占用，无法启动后端。请先释放该端口后重试。`);
  }

  log(runInHeadlessMode ? '正在启动后端（无弹窗模式）...' : '正在弹出后端窗口...');

  if (runInHeadlessMode) {
    const result = startHeadlessProcess(
      backendDir,
      'npm start',
      'backend.out.log',
      'backend.err.log'
    );

    log(`后端进程已启动，PID：${result.pid}`);
    log(`后端日志：${path.relative(rootDir, result.stdoutPath)}`);
  } else {
    startGuiTerminal('CHD-Backend', backendDir, '长安大学校园服务平台 - 后端', 'npm start');
  }

  await waitFor(isBackendReady, '后端服务');
  log(`后端已就绪：${backendHealthUrl}`);
}

async function startFrontend() {
  const existingUrl = await detectFrontendUrl();
  if (existingUrl) {
    log(`检测到前端已经在运行，直接复用：${existingUrl}`);
    return existingUrl;
  }

  log(runInHeadlessMode ? '正在启动前端（无弹窗模式）...' : '正在弹出前端窗口...');

  if (runInHeadlessMode) {
    const result = startHeadlessProcess(
      frontendDir,
      'npm run dev',
      'frontend.out.log',
      'frontend.err.log'
    );

    log(`前端进程已启动，PID：${result.pid}`);
    log(`前端日志：${path.relative(rootDir, result.stdoutPath)}`);
  } else {
    startGuiTerminal('CHD-Frontend', frontendDir, '长安大学校园服务平台 - 前端', 'npm run dev');
  }

  const frontendUrl = await waitFor(detectFrontendUrl, '前端服务');
  log(`前端已就绪：${frontendUrl}`);
  return frontendUrl;
}

async function main() {
  printBanner();
  ensureEnvironment();

  await startBackend();
  const frontendUrl = await startFrontend();

  console.log('');
  log('平台启动完成。');
  log(`用户端：${frontendUrl}`);
  log(`管理端：${frontendUrl}/admin`);
  log(`后端健康检查：${backendHealthUrl}`);

  if (!disableBrowser) {
    openBrowser(frontendUrl);
    log('已自动打开浏览器。');
  } else {
    log('已跳过自动打开浏览器。');
  }

  console.log('');
  if (runInHeadlessMode) {
    log('当前为无弹窗模式，服务已在后台运行。');
  } else {
    log('前后端窗口会保持运行，关闭对应窗口即可停止服务。');
  }
}

main().catch((error) => {
  fail(error.message || '启动器执行失败。');
});
