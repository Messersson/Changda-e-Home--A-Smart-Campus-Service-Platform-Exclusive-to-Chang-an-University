const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

module.exports = {
  apps: [
    {
      name: 'chd-campus-backend-dev',
      cwd: backendDir,
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      watch: ['app.js', 'routes', 'middleware', 'database', 'utils'],
      ignore_watch: ['coverage', 'logs', 'node_modules'],
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    {
      name: 'chd-campus-backend-prod',
      cwd: backendDir,
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'chd-campus-frontend-dev',
      cwd: frontendDir,
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 5173',
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'chd-campus-frontend-preview',
      cwd: frontendDir,
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 4173',
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
