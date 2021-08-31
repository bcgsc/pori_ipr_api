module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   *
   * *NOTE* There is currently a bug with PM2 when in cluster mode. The
   * issue is that PM2 is receiving the config/env variables
   * (i.e out/error log location, add date to logs, etc.), but it is
   * not using them. The logs are going to pm2.log and there is no
   * date added to the start of each log line.
   * Once this bug is fixed the exec_mode can be switched back to
   * cluster and this change can be reverted.
   * The version of PM2 that this issue is happening on is 4.5.6**
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
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      env_staging: {
        NODE_ENV: 'staging',
      },
    },
  ],
};
