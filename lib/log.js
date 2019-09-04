const winston = require('winston'); // Logging
const moment = require('moment');
const nconf = require('../app/config');

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      timestamp: () => { return moment().format('YYYY-MM-DD HH:mm:ss'); },
      formatter: (options) => {
        return `[${options.timestamp()}][${options.level.toUpperCase()}] ${options.message
          ? options.message
          : ''} ${options.meta && Object.keys(options.meta).length
          ? `\n\t${JSON.stringify(options.meta)}`
          : ''}`;
      },
    }),
    // new (winston.transports.File)({
    // filename: process.cwd() + '../persist/logs/syncWorker/combined.err.log'})
  ],
});

logger.info('Initializing logging');

logger.level = nconf.get('logging:level');
logger.debug('Log level set to debug');

module.exports = logger;
