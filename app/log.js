const winston = require('winston'); // Logging
const moment = require('moment');
const nconf = require('./config');

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

logger.level = nconf.get('log:level');
logger.debug(`Log level set to ${nconf.get('log:level')}`);

module.exports = logger;