module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // Application Server
    {
      name              : 'IPR-API',
      script            : 'bin/www',
      cwd               : '/var/www/ipr/api/production/current',
      watch             : false,
      log_date_format   : 'YYYY-MM-DD HH:mm Z',
      log_file          : '../persist/logs/combined.outerr.log',
      out_file          : '../persist/logs/out.log',
      err_file          : '../persist/logs/err.log',
      pid_file          : '../persist/pid/ipr-api-pm_id.pid',
      merge_logs        : true,
      env: {
        COMMON_VARIABLE: 'true',
        NODE_ENV: 'development'
      },
      env_production : {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      }
    },
    
    // Sync Worker
    {
      name              : 'IPR-API-syncWorker',
      script            : 'bin/syncWorker',
      cwd               : '/var/www/ipr/api/production/current',
      watch             : false,
      log_date_format   : 'YYYY-MM-DD HH:mm Z',
      log_file          : '../persist/logs/sync.combined.outerr.log',
      out_file          : '../persist/logs/sync.out.log',
      err_file          : '../persist/logs/sync.err.log',
      pid_file          : '../persist/pid/ipr-api-sync-pm_id.pid',
      merge_logs        : true,
      env: {
        COMMON_VARIABLE: 'true',
        NODE_ENV: 'development'
      },
      env_production : {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      }
    }
  ],
};
