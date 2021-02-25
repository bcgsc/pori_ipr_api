const {createLogger, format, transports} = require('winston');
const nconf = require('./config');

const logger = createLogger({
  format: format.combine(
    format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    format.printf(({level, message, timestamp, ...meta}) => {
      return `[${timestamp}][${level.toUpperCase()}] ${message} ${(meta && Object.keys(meta).length) ? `\n\t${JSON.stringify(meta)}` : ''}`;
    }),
  ),
  transports: [new transports.Console()],
});

logger.info('Initializing logging');
logger.debug(`Log level set to ${nconf.get('log:level')}`);

module.exports = logger;
