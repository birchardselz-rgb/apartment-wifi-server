module.exports = {
  apps: [{
    name: 'apartment-wifi',
    script: 'backend/server.js',
    cwd: __dirname,
    max_restarts: 10,
    restart_delay: 3000,
    max_memory_restart: '500M',
    kill_timeout: 10000,
    listen_timeout: 15000,
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true,
  }, {
    name: 'ai-cs-backend',
    script: 'dist/main.js',
    cwd: __dirname + '/ai-customer-service/backend',
    interpreter: 'node',
    env: {
      PORT: '3002',
    },
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '500M',
    listen_timeout: 20000,  // AI 后端 SQLite 启动较慢，给 20 秒
    kill_timeout: 10000,    // 优雅关闭等待 10 秒
    error_file: './logs/ai-error.log',
    out_file: './logs/ai-out.log',
    merge_logs: true,
  }, {
    name: 'ai-cs-frontend',
    script: 'node_modules/vite/bin/vite.js',
    cwd: __dirname + '/ai-customer-service/frontend',
    interpreter: 'node',
    args: '--host',
    max_restarts: 10,
    restart_delay: 3000,
    max_memory_restart: '500M',
    error_file: './logs/ai-frontend-error.log',
    out_file: './logs/ai-frontend-out.log',
    merge_logs: true,
  }]
};
