module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [

    // Application Server
    {
      name: 'IPR-API',
      script: 'npm',
      args: 'start',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_restarts: 20,
      min_uptime: 10000,
      append_env_to_name: true,
      env: {
        COMMON_VARIABLE: 'true',
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
    },
    // Sync Worker
    {
      name: 'IPR-API-syncWorker',
      script: 'npm',
      args: 'sync',
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      max_restarts: 20,
      min_uptime: 10000,
      append_env_to_name: true,
      env: {
        COMMON_VARIABLE: 'true',
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
    },
  ],
};
