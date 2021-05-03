const {listen} = require('../app');
const logger = require('../app/log');

process.on('unhandledRejection', (reason, p) => {
  // fix for node 10: https://stackoverflow.com/questions/51632965/can-i-get-the-future-unhandled-promise-rejection-behaviour-now
  logger.error(`Unhandled Rejection at: ${p} reason: ${reason}`);
  process.exit(1);
});

// Start app
listen()
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });
