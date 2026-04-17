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

const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'npm.cmd' : 'npm';

const args = new Set(process.argv.slice(2));
const prefersHeadless = args.has('--headless');
const prefersWindows = args.has('--windows');
const disableBrowser = args.has('--no-browser');
const wantsHelp = args.has('--help') || args.has('-h');
const wantsStop = args.has('--stop');
const wantsRestartBackend = args.has('--restart-backend') || args.has('--restart-all');
const wantsRestartFrontend = args.has('--restart-frontend') || args.has('--restart-all');
const startTimeoutMs = Number(process.env.PLATFORM_START_TIMEOUT_MS) || 90000;
const requestTimeoutMs = Number(process.env.PLATFORM_REQUEST_TIMEOUT_MS) || 1200;
const pollIntervalMs = 1200;
const runInHeadlessMode = !isWindows || prefersHeadless || !prefersWindows;

const backendService = {
  key: 'backend',
  label: '后端',
  title: 'CHD-Backend',
  heading: 'CHD Campus Platform - Backend',
  cwd: backendDir,
  npmArgs: ['start'],
  pidFileName: 'backend.pid',
  stdoutFileName: 'backend.out.log',
  stderrFileName: 'backend.err.log'
};

const frontendService = {
  key: 'frontend',
  label: '前端',
  title: 'CHD-Frontend',
  heading: 'CHD Campus Platform - Frontend',
  cwd: frontendDir,
  npmArgs: ['run', 'dev'],
  pidFileName: 'frontend.pid',
  stdoutFileName: 'frontend.out.log',
  stderrFileName: 'frontend.err.log'
};

function printBanner() {
  console.log('========================================');
  console.log('长安大学校园服务平台 - 一键启动');
  console.log('========================================');
  console.log('');
}

function printHelp() {
  console.log('用法: node scripts/start-platform.js [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --headless    以后台模式启动服务');
  console.log('  --windows     为前后端分别打开独立终端窗口');
  console.log('  --no-browser  启动后不自动打开浏览器');
  console.log('  --stop        停止前端和后端服务');
  console.log('  --restart-backend  重启后端服务');
  console.log('  --restart-frontend 重启前端服务');
  console.log('  --restart-all 重启前端和后端');
  console.log('  -h, --help    显示帮助信息');
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

function runCommand(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true
  });
}

function parseWindowsPortPids(output, port) {
  return String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes(`:${port}`) && line.includes('LISTENING'))
    .map((line) => line.split(/\s+/).pop())
    .map((pid) => Number.parseInt(pid, 10))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

function getListeningPidsByPort(port) {
  if (isWindows) {
    const result = runCommand('cmd.exe', [
      '/d',
      '/c',
      `netstat -ano -p tcp | findstr LISTENING | findstr :${port}`
    ]);
    return [...new Set(parseWindowsPortPids(result.stdout, port))];
  }

  const result = runCommand('lsof', ['-ti', `tcp:${port}`]);
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => Number.parseInt(line.trim(), 10))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

function terminatePid(pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid);
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForPortsToClose(ports, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const openPorts = ports.filter((port) => getListeningPidsByPort(port).length > 0);

    if (openPorts.length === 0) {
      return true;
    }

    await sleep(400);
  }

  return false;
}

async function stopServices(options = {}) {
  const stopBackend = options.backend !== false;
  const stopFrontend = options.frontend !== false;
  const pids = [];

  if (stopBackend) {
    const backendPid = readPidFile(backendService);
    if (backendPid) {
      pids.push(backendPid);
    }
  }

  if (stopFrontend) {
    const frontendPid = readPidFile(frontendService);
    if (frontendPid) {
      pids.push(frontendPid);
    }
  }

  if (stopBackend) {
    pids.push(...getListeningPidsByPort(backendPort));
  }

  if (stopFrontend) {
    frontendPorts.forEach((port) => {
      pids.push(...getListeningPidsByPort(port));
    });
  }

  const uniquePids = [...new Set(pids)];

  if (uniquePids.length === 0) {
    log('未检测到需要停止的前端或后端进程。');
    return;
  }

  uniquePids.forEach((pid) => {
    if (terminatePid(pid)) {
      log(`已发起停止进程 PID=${pid}`);
    } else {
      warn(`停止进程失败，PID=${pid}`);
    }
  });

  const portsToCheck = [];
  if (stopBackend) {
    portsToCheck.push(backendPort);
  }
  if (stopFrontend) {
    portsToCheck.push(...frontendPorts);
  }

  const closed = await waitForPortsToClose(portsToCheck);
  if (!closed) {
    warn('部分端口在等待后仍未关闭，请手动检查任务管理器或进程列表。');
  }
  if (stopBackend) {
    removePidFile(backendService);
  }
  if (stopFrontend) {
    removePidFile(frontendService);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getPidFilePath(service) {
  return path.join(launcherLogsDir, service.pidFileName);
}

function writePidFile(service, pid) {
  if (!Number.isFinite(pid) || pid <= 0) {
    return;
  }

  ensureDir(launcherLogsDir);
  fs.writeFileSync(getPidFilePath(service), String(pid), 'utf8');
}

function readPidFile(service) {
  const pidFilePath = getPidFilePath(service);

  if (!fs.existsSync(pidFilePath)) {
    return null;
  }

  const pid = Number.parseInt(fs.readFileSync(pidFilePath, 'utf8').trim(), 10);
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

function removePidFile(service) {
  const pidFilePath = getPidFilePath(service);

  if (fs.existsSync(pidFilePath)) {
    fs.unlinkSync(pidFilePath);
  }
}

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`缺少 ${label}: ${path.relative(rootDir, filePath)}`);
  }
}

function commandExists(commandName) {
  const lookupCommand = isWindows ? 'where.exe' : 'which';
  const result = spawnSync(lookupCommand, [commandName], { stdio: 'ignore' });
  return result.status === 0;
}

function ensureEnvironment() {
  ensureFileExists(path.join(backendDir, 'package.json'), 'backend/package.json');
  ensureFileExists(path.join(frontendDir, 'package.json'), 'frontend/package.json');

  if (!commandExists('node')) {
    fail('未在 PATH 中找到 Node.js。');
  }

  if (!commandExists(npmExecutable)) {
    fail(`未在 PATH 中找到 ${npmExecutable}。`);
  }

  if (!fs.existsSync(path.join(backendDir, 'node_modules'))) {
    fail('后端依赖缺失，请先执行 `cd backend && npm install`。');
  }

  if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
    fail('前端依赖缺失，请先执行 `cd frontend && npm install`。');
  }

  if (!isWindows && prefersWindows) {
    warn('--windows 仅支持 Windows，已自动切换为后台模式。');
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

    request.setTimeout(requestTimeoutMs, () => {
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
  const results = await Promise.all(
    frontendPorts.map(async (port) => {
      const url = `http://127.0.0.1:${port}`;
      const result = await httpGet(url);

      if (result.ok && result.statusCode === 200 && isProjectFrontendHtml(result.body)) {
        return url;
      }

      return null;
    })
  );

  return results.find(Boolean) || null;
}

function isTcpPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });

    socket.setTimeout(800);
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
    const child = spawn('cmd.exe', ['/d', '/c', 'start', '', url], {
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

function buildWindowsLauncherScript(service) {
  const lines = [
    '@echo off',
    'chcp 65001 >nul',
    'setlocal',
    '',
    `title ${service.title}`,
    'echo ========================================',
    `echo ${service.heading}`,
    'echo ========================================',
    'echo.',
    'echo Working directory: %CD%',
    'echo Command: ' + [npmExecutable, ...service.npmArgs].join(' '),
    'echo.',
    `call ${npmExecutable} ${service.npmArgs.join(' ')}`,
    'set "exitCode=%errorlevel%"',
    'echo.',
    'if not "%exitCode%"=="0" (',
    '  echo Process exited with code %exitCode%.',
    ') else (',
    '  echo Process exited normally.',
    ')',
    'echo.',
    'echo Press any key to close this window.',
    'pause >nul',
    'exit /b %exitCode%',
    ''
  ];

  return lines.join('\r\n');
}

function writeWindowsLauncherScript(service) {
  ensureDir(launcherLogsDir);

  const scriptPath = path.join(launcherLogsDir, `${service.key}-window.cmd`);
  fs.writeFileSync(scriptPath, buildWindowsLauncherScript(service), 'utf8');
  return scriptPath;
}

function startGuiTerminal(service) {
  const launcherScriptPath = writeWindowsLauncherScript(service);
  const child = spawn(
    'cmd.exe',
    ['/d', '/c', 'start', '', 'cmd.exe', '/d', '/k', launcherScriptPath],
    {
      cwd: service.cwd,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    }
  );

  child.unref();
  return launcherScriptPath;
}

function startHiddenWindowsProcess(service) {
  ensureDir(launcherLogsDir);

  const stdoutPath = path.join(launcherLogsDir, service.stdoutFileName);
  const stderrPath = path.join(launcherLogsDir, service.stderrFileName);
  const commandText = [npmExecutable, ...service.npmArgs].join(' ');

  fs.writeFileSync(stdoutPath, '', 'utf8');
  fs.writeFileSync(stderrPath, '', 'utf8');

  const powerShellCommand = [
    `$workingDir = '${toPowerShellLiteral(service.cwd)}'`,
    `$stdout = '${toPowerShellLiteral(stdoutPath)}'`,
    `$stderr = '${toPowerShellLiteral(stderrPath)}'`,
    `$command = '${toPowerShellLiteral(commandText)}'`,
    `$process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d', '/s', '/c', $command) -WorkingDirectory $workingDir -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru`,
    `[Console]::Out.Write($process.Id)`
  ].join('; ');

  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powerShellCommand],
    {
      cwd: service.cwd,
      encoding: 'utf8',
      windowsHide: true
    }
  );

  if (result.status !== 0) {
    const details = (result.stderr || result.stdout || '').trim();
    fail(`以隐藏模式启动${service.label}失败。${details ? ` ${details}` : ''}`);
  }

  const pid = Number.parseInt((result.stdout || '').trim(), 10);

  const processInfo = {
    pid: Number.isFinite(pid) ? pid : null,
    stdoutPath,
    stderrPath
  };

  writePidFile(service, processInfo.pid);
  return processInfo;
}

function startHeadlessProcess(service) {
  if (isWindows) {
    return startHiddenWindowsProcess(service);
  }

  ensureDir(launcherLogsDir);

  const stdoutPath = path.join(launcherLogsDir, service.stdoutFileName);
  const stderrPath = path.join(launcherLogsDir, service.stderrFileName);
  const stdoutFd = fs.openSync(stdoutPath, 'w');
  const stderrFd = fs.openSync(stderrPath, 'w');
  const child = spawn(npmExecutable, service.npmArgs, {
    cwd: service.cwd,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd]
  });

  child.unref();

  const processInfo = {
    pid: child.pid,
    stdoutPath,
    stderrPath
  };

  writePidFile(service, processInfo.pid);
  return processInfo;
}

async function launchBackend() {
  const alreadyRunning = await isBackendReady();
  if (alreadyRunning) {
    log('检测到后端已在运行，直接复用现有服务。');
    return { reused: true };
  }

  const occupied = await isTcpPortOpen(backendPort);
  if (occupied) {
    fail(`端口 ${backendPort} 已被其他进程占用。`);
  }

  if (runInHeadlessMode) {
    log('正在后台启动后端...');
    const result = startHeadlessProcess(backendService);
    log(`后端进程已启动，PID：${result.pid}`);
    log(`后端标准输出日志：${path.relative(rootDir, result.stdoutPath)}`);
    log(`后端错误日志：${path.relative(rootDir, result.stderrPath)}`);
  } else {
    log('正在为后端打开独立终端窗口...');
    const scriptPath = startGuiTerminal(backendService);
    log(`后端启动脚本：${path.relative(rootDir, scriptPath)}`);
  }

  return { reused: false };
}

async function waitForBackendReady() {
  await waitFor(isBackendReady, '后端服务');
  log(`后端已就绪：${backendHealthUrl}`);
}

async function launchFrontend() {
  const existingUrl = await detectFrontendUrl();
  if (existingUrl) {
    log(`检测到前端已在运行，直接复用：${existingUrl}`);
    return { reused: true, url: existingUrl };
  }

  if (runInHeadlessMode) {
    log('正在后台启动前端...');
    const result = startHeadlessProcess(frontendService);
    log(`前端进程已启动，PID：${result.pid}`);
    log(`前端标准输出日志：${path.relative(rootDir, result.stdoutPath)}`);
    log(`前端错误日志：${path.relative(rootDir, result.stderrPath)}`);
  } else {
    log('正在为前端打开独立终端窗口...');
    const scriptPath = startGuiTerminal(frontendService);
    log(`前端启动脚本：${path.relative(rootDir, scriptPath)}`);
  }

  return { reused: false, url: null };
}

async function waitForFrontendReady() {
  const frontendUrl = await waitFor(detectFrontendUrl, '前端服务');
  log(`前端已就绪：${frontendUrl}`);
  return frontendUrl;
}

async function main() {
  if (wantsHelp) {
    printHelp();
    return;
  }

  printBanner();
  ensureEnvironment();

  if (wantsStop) {
    await stopServices({ backend: true, frontend: true });
    log('平台服务已停止。');
    return;
  }

  if (wantsRestartBackend || wantsRestartFrontend) {
    await stopServices({
      backend: wantsRestartBackend,
      frontend: wantsRestartFrontend
    });
  }

  const [backendLaunch, frontendLaunch] = await Promise.all([
    launchBackend(),
    launchFrontend()
  ]);

  const [, frontendUrl] = await Promise.all([
    backendLaunch.reused ? Promise.resolve() : waitForBackendReady(),
    frontendLaunch.reused ? Promise.resolve(frontendLaunch.url) : waitForFrontendReady()
  ]);

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
    log('当前为后台运行模式，服务已在后台启动。');
  } else {
    log('关闭服务窗口即可停止前端或后端。');
  }
}

main().catch((error) => {
  fail(error.message || '启动器执行失败。');
});
