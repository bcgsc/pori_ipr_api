module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name              : 'IPR-API-test',
      script            : 'bin/www',
      cwd               : '/var/www/ipr/api/test/current',
      watch             : false,
      log_date_format   : 'YYYY-MM-DD HH:mm Z',
      log_file          : '../persist/logs/combined.outerr.log',
      out_file          : '../persist/logs/out.log',
      err_file          : '../persist/logs/err.log',
      pid_file          : '../persist/pid/ipr-api-pm_id.pid',
      merge_logs        : true,
      env: {
        COMMON_VARIABLE: 'true',
        NODE_ENV: 'test'
      },
      env_production : {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      env_test: {
        NODE_ENV: 'test'
      }
    },
  ],
};
