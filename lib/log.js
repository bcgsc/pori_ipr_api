"use strict";

const winston       = require('winston');    // Logging
const moment        = require('moment');

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      timestamp: function() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
      },
      formatter: (options) => {
        return '[' + options.timestamp() + '][' + options.level.toUpperCase() + '] ' + (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
      }
    }),
    new (winston.transports.File)({filename: '../persist/logs/syncWorker/combined.err.log'})
  ]
});

logger.info('Initializing logging');

if(process.env.NODE_ENV !== 'production') logger.level = 'debug';
logger.debug('Log level set to debug');

module.exports = logger;