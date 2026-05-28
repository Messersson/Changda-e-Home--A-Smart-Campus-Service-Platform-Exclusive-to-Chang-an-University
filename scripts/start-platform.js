'use strict';

const http = require('http');
const net = require('net');
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--hidden');
const args = new Set(rawArgs);

const useProd = args.has('--prod');
const wantsStop = args.has('--stop');
const disableBrowser = args.has('--no-browser');
const noBuild = args.has('--no-build');
const forceRebuild = args.has('--rebuild') || args.has('--build');
const checkOnly = args.has('--check');
const wantsHelp = args.has('--help') || args.has('-h');

const composeFile = useProd ? 'docker-compose.prod.yml' : 'docker-compose.dev.yml';
const composeProject = useProd ? 'chd-campus-prod' : 'chd-campus-dev';
const modeName = useProd ? '生产模式' : '开发模式';
const frontendUrl = useProd ? 'http://127.0.0.1:8080' : 'http://127.0.0.1:5173';
const frontendPort = useProd ? 8080 : 5173;
const dbName = useProd ? process.env.DB_NAME || 'changan_campus_service' : 'changan_campus_service';
const dbUser = useProd ? process.env.DB_USER || 'campus' : 'root';
const dbPassword = useProd ? process.env.DB_PASSWORD || '3709Lp' : '3709Lp';
const dbAddress = useProd ? 'mysql:3306 (container network)' : '127.0.0.1:3306 (host MySQL)';
const backendBaseUrl = 'http://127.0.0.1:3000';
const backendPort = 3000;
const backendHealthUrl = `${backendBaseUrl}/api/health`;
const appImages = [`${composeProject}-backend:latest`, `${composeProject}-frontend:latest`];
const dockerHubImages = [
  'mysql:8.4',
  'maven:3.9-eclipse-temurin-17',
  'eclipse-temurin:17-jre',
  'node:20-alpine',
  'nginx:1.27-alpine'
];

function log(message) {
  console.log(`[平台] ${message}`);
}

function warn(message) {
  console.error(`[平台] ${message}`);
}

function fail(message) {
  console.error(`[平台] ${message}`);
  process.exit(1);
}

function blankLine() {
  console.log('');
}

function printBanner() {
  console.log('============================================================');
  console.log('长安大学校园服务平台启动器');
  console.log(`运行模式: ${modeName}`);
  console.log(`编排文件: ${composeFile}`);
  console.log('============================================================');
}

function printHelp() {
  printBanner();
  console.log('用法: node scripts/start-platform.js [选项]');
  blankLine();
  console.log('常用选项:');
  console.log('  --check       只检查 Docker、Compose 配置和访问地址');
  console.log('  --stop        停止当前模式的 Docker Compose 服务');
  console.log('  --prod        使用生产编排文件，前端端口为 8080');
  console.log('  --no-browser  启动成功后不自动打开浏览器');
  console.log('  --no-build    只使用本地已有镜像启动，不执行构建');
  console.log('  --rebuild     强制重新构建前端和后端镜像');
  console.log('  -h, --help    显示帮助信息');
  blankLine();
  console.log('提速说明: 默认会自动检测本地镜像。镜像已存在时跳过构建，镜像缺失时才构建。');
}

function printAddresses() {
  blankLine();
  console.log('访问地址');
  console.log(`  前端用户端: ${frontendUrl}`);
  console.log(`  前端管理端: ${frontendUrl}/admin`);
  console.log(`  后端接口:   ${backendBaseUrl}/api`);
  console.log(`  后端健康:   ${backendHealthUrl}`);
  console.log(`  接口文档:   ${backendBaseUrl}/swagger-ui.html`);
  console.log(`  数据库地址: ${dbAddress}`);
  console.log(`  数据库名称: ${dbName}`);
  console.log(`  数据库账号: ${dbUser}`);
  console.log(`  数据库密码: ${dbPassword}`);
  blankLine();
}

function commandLine(command, commandArgs) {
  return [command, ...commandArgs].join(' ');
}

function dockerEnv(extra = {}) {
  return {
    ...process.env,
    COMPOSE_PROGRESS: 'quiet',
    BUILDKIT_PROGRESS: 'auto',
    DOCKER_BUILDKIT: '1',
    ...extra
  };
}

function probe(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    stdio: 'pipe',
    windowsHide: true,
    env: dockerEnv()
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error
  };
}

function outputText(result) {
  return [result.stderr, result.stdout, result.error && result.error.message]
    .filter(Boolean)
    .join('\n')
    .trim();
}

function explainFailure(output) {
  const text = output.toLowerCase();

  if (text.includes('permission denied') && text.includes('docker')) {
    warn('Docker 已安装，但当前终端没有权限访问 Docker 引擎。');
    warn('请确认 Docker Desktop 已启动，并在有 Docker 权限的终端中运行启动器。');
    return;
  }

  if (
    text.includes('failed to fetch anonymous token') ||
    text.includes('auth.docker.io') ||
    text.includes('registry-1.docker.io') ||
    text.includes('docker.io')
  ) {
    warn('Docker Hub 基础镜像拉取失败，通常是网络、代理或镜像源问题。');
    warn(`本项目需要的基础镜像: ${dockerHubImages.join(', ')}`);
    warn('网络恢复后重新运行启动器即可。若前后端镜像已经存在，可使用 --no-build 快速启动。');
    return;
  }

  if (text.includes('no such image') || text.includes('pull access denied')) {
    warn('本地缺少前端或后端镜像，无法使用 --no-build。');
    warn('请去掉 --no-build 让启动器执行首次构建，或使用 --rebuild 强制重建。');
  }
}

function failProbe(label, command, commandArgs, result) {
  const output = outputText(result);
  warn(`${label}失败: ${commandLine(command, commandArgs)}`);
  if (output) {
    console.error(output);
    explainFailure(output);
  }
  process.exit(1);
}

function requireProbe(label, command, commandArgs) {
  const result = probe(command, commandArgs);
  if (!result.ok) {
    failProbe(label, command, commandArgs, result);
  }
  return result;
}

function tail(text, maxLines = 80) {
  const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

function run(command, commandArgs, options = {}) {
  const quiet = options.quiet !== false;
  const progressMessage = options.progressMessage || '命令正在执行';
  const progressIntervalMs = options.progressIntervalMs || 15000;

  return new Promise((resolve, reject) => {
    let output = '';
    let elapsedTicks = 0;
    const remember = (chunk) => {
      output += chunk;
      if (output.length > 60000) {
        output = output.slice(output.length - 60000);
      }
    };

    const child = spawn(command, commandArgs, {
      cwd: rootDir,
      env: dockerEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true
    });

    const timer = quiet
      ? setInterval(() => {
          elapsedTicks += 1;
          log(`${progressMessage}，已等待 ${Math.round((elapsedTicks * progressIntervalMs) / 1000)} 秒`);
        }, progressIntervalMs)
      : null;

    child.stdout.on('data', (chunk) => {
      remember(chunk.toString());
      if (!quiet) {
        process.stdout.write(chunk);
      }
    });

    child.stderr.on('data', (chunk) => {
      remember(chunk.toString());
      if (!quiet) {
        process.stderr.write(chunk);
      }
    });

    child.on('error', (error) => {
      if (timer) {
        clearInterval(timer);
      }
      error.output = output;
      reject(error);
    });

    child.on('close', (code) => {
      if (timer) {
        clearInterval(timer);
      }

      if (code === 0) {
        resolve(output);
      } else {
        const error = new Error(`${commandLine(command, commandArgs)} 退出码 ${code}`);
        error.output = output;
        reject(error);
      }
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 3000 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function waitFor(url, label, timeoutMs = 120000) {
  const startedAt = Date.now();
  let lastReport = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (await httpOk(url)) {
      log(`${label}已就绪: ${url}`);
      return;
    }

    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    if (elapsedSeconds - lastReport >= 10) {
      lastReport = elapsedSeconds;
      log(`正在等待${label}就绪，已等待 ${elapsedSeconds} 秒`);
    }

    await sleep(1500);
  }

  fail(`${label}在 ${Math.round(timeoutMs / 1000)} 秒内未就绪: ${url}`);
}

function composeArgs(...commandArgs) {
  return ['compose', '-p', composeProject, '-f', composeFile, ...commandArgs];
}

function runDocker(commandArgs, options = {}) {
  return run('docker', commandArgs, options);
}

function targetComposeServicesRunning() {
  const result = probe('docker', composeArgs('ps', '--services', '--status', 'running'));
  if (!result.ok) {
    return new Set();
  }

  return new Set(result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port, timeout: 1000 });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function guardAgainstForeignPorts() {
  const runningServices = targetComposeServicesRunning();
  const checks = [
    { port: frontendPort, service: 'frontend', label: '前端' },
    { port: backendPort, service: 'backend', label: '后端' }
  ];

  for (const item of checks) {
    if (runningServices.has(item.service)) {
      continue;
    }

    if (await portOpen(item.port)) {
      fail(
        `${item.label}端口 ${item.port} 已被其他程序占用。请先关闭占用该端口的旧项目，再重新运行启动器。`
      );
    }
  }
}

function imageExists(image) {
  return probe('docker', ['image', 'inspect', image]).ok;
}

function missingAppImages() {
  return appImages.filter((image) => !imageExists(image));
}

function chooseStartPlan() {
  if (noBuild && forceRebuild) {
    fail('--no-build 和 --rebuild 不能同时使用。');
  }

  if (forceRebuild) {
    return {
      name: '强制重建启动',
      args: composeArgs('up', '-d', '--build', '--quiet-build', '--quiet-pull'),
      quiet: true,
      progressMessage: '正在重新构建并启动服务'
    };
  }

  if (noBuild) {
    return {
      name: '快速启动',
      args: composeArgs('up', '-d', '--no-build', '--quiet-pull'),
      quiet: true,
      progressMessage: '正在使用本地镜像启动服务'
    };
  }

  const missing = missingAppImages();
  if (missing.length === 0) {
    log('检测到本地前端和后端镜像，使用快速启动并跳过构建。');
    log('如果修改过前端或后端代码，请使用 --rebuild 重新构建。');
    return {
      name: '智能快速启动',
      args: composeArgs('up', '-d', '--no-build', '--quiet-pull'),
      quiet: true,
      progressMessage: '正在快速启动服务'
    };
  }

  log(`缺少本地镜像: ${missing.join(', ')}`);
  log('将执行首次构建。首次构建需要下载基础镜像和依赖，后续启动会明显更快。');
  return {
    name: '首次构建启动',
    args: composeArgs('up', '-d', '--build', '--quiet-build', '--quiet-pull'),
    quiet: true,
    progressMessage: '正在构建镜像并启动服务'
  };
}

function preflight() {
  const dockerCli = requireProbe('Docker CLI 检查', 'docker', ['--version']);
  log(`Docker CLI: ${dockerCli.stdout.trim()}`);

  const compose = requireProbe('Docker Compose 检查', 'docker', ['compose', 'version']);
  log(`Docker Compose: ${compose.stdout.trim()}`);

  const engine = requireProbe('Docker 引擎检查', 'docker', ['info', '--format', '{{.ServerVersion}}']);
  log(`Docker 引擎: ${engine.stdout.trim()}`);

  requireProbe('Compose 配置检查', 'docker', composeArgs('config'));
  log(`Compose 配置有效: ${composeFile}`);
}

function openBrowser(url) {
  if (disableBrowser) {
    return;
  }

  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const commandArgs = isWindows ? ['/d', '/c', 'start', '', url] : [url];
  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    stdio: 'ignore',
    detached: true,
    windowsHide: true
  });
  child.unref();
}

async function main() {
  if (wantsHelp) {
    printHelp();
    return;
  }

  printBanner();
  preflight();

  if (!wantsStop) {
    printAddresses();
  }

  if (checkOnly) {
    log('启动器检查通过。');
    return;
  }

  if (wantsStop) {
    log('正在停止服务...');
    await runDocker(composeArgs('down'), {
      quiet: true,
      progressMessage: '正在停止 Docker Compose 服务'
    });
    log('服务已停止。');
    return;
  }

  await guardAgainstForeignPorts();

  const plan = chooseStartPlan();
  log(`启动方式: ${plan.name}`);
  await runDocker(plan.args, {
    quiet: plan.quiet,
    progressMessage: plan.progressMessage
  });

  await waitFor(backendHealthUrl, '后端服务');
  await waitFor(frontendUrl, '前端服务');

  log('平台启动完成。');
  printAddresses();
  openBrowser(frontendUrl);
}

main().catch((error) => {
  const output = error.output || error.message || '';
  if (output) {
    const clipped = tail(output);
    if (clipped) {
      warn('命令输出摘要:');
      console.error(clipped);
    }
    explainFailure(output);
  }
  fail(error.message);
});
