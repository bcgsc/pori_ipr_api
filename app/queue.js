const {Queue, Worker} = require('bullmq');
const nodemailer = require('nodemailer');
const conf = require('./config');

const {host, port, enableQueue} = conf.get('redis_queue');
const logger = require('./log'); // Load logging library

const CONFIG = require('./config');

const {email, password} = CONFIG.get('email');

const queue = () => {
  if (enableQueue) {
    logger.info('queue enabled');
    return new Queue('myqueue', {
      connection: {
        host,
        port,
      },
    });
  }
  logger.info('queue not enabled');
  return null;
};

const myqueue = queue();

const DEFAULT_REMOVE_CONFIG = {
  removeOnComplete: {
    age: 3600,
  },
  removeOnFail: {
    age: 24 * 3600,
  },
  attempts: 10,
};

const addJobToQueue = async (data) => {
  if (myqueue) {
    logger.info('adding job to queue: ', data);
    return myqueue.add('job', data, DEFAULT_REMOVE_CONFIG);
  }
  return null;
};

// Initialize a new worker
const setUpWorker = (jobProcessor) => {
  const worker = () => {
    if (enableQueue) {
      return new Worker(
        'myqueue',
        jobProcessor,
        {connection: {
          host,
          port,
        },
        autorun: true,
        limiter: {
          max: 10,
          duration: 60000,
        }},
      );
    }
    return null;
  };

  const workerInstance = worker();
  if (workerInstance) {
    workerInstance.on('completed', async (job) => {
      await job.remove();
      logger.info(`Job with ID ${job.id} has been completed.`);
    });

    workerInstance.on('failed', (job, err) => {
      logger.error(`Job with ID ${job.id} has failed with error: ${err.message}`);
    });
  }
};

const defaultProcessor = async (job) => {
  // Process the job data
  const transporter = nodemailer.createTransport({
    host: 'webmail.bcgsc.ca',
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail(job.data);
  } catch (err) {
    logger.error(JSON.stringify(job.data));
    throw new Error(err);
  }
};

setUpWorker(defaultProcessor);

module.exports = {addJobToQueue};
