const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const {listen} = require('../app');
const logger = require('../app/log');

process.on('unhandledRejection', (reason, p) => {
  // fix for node 10: https://stackoverflow.com/questions/51632965/can-i-get-the-future-unhandled-promise-rejection-behaviour-now
  logger.error(`Unhandled Rejection at: ${p} reason: ${reason}`);
  process.exit(1);
});

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  cluster.on('exit', (worker, code, signal) => {
    logger.info(`Worker ${worker.process.pid} died\nCode: ${code}\nSignal: ${signal}`);
  });
} else {
  // Start app
  listen()
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}
