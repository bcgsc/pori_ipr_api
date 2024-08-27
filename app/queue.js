const {Queue, Worker} = require('bullmq');
const nodemailer = require('nodemailer');
const conf = require('./config');
const createReport = require('./libs/createReport');

const {host, port, enableQueue} = conf.get('redisqueue');
const logger = require('./log'); // Load logging library

const CONFIG = require('./config');

const {email, password, ehost} = CONFIG.get('email');

const setUpEmailQueue = () => {
  if (enableQueue) {
    logger.info('email queue enabled');
    return new Queue('emailQueue', {
      connection: {
        host,
        port,
      },
    });
  }
  logger.info('email queue not enabled');
  return null;
};

const emailQueue = setUpEmailQueue();

const EMAIL_REMOVE_CONFIG = {
  removeOnComplete: {
    age: 3600,
  },
  removeOnFail: {
    age: 24 * 3600,
  },
  attempts: 10,
};

const addJobToEmailQueue = async (data) => {
  if (emailQueue) {
    logger.info('adding email to queue: ', data);
    return emailQueue.add('job', data, EMAIL_REMOVE_CONFIG);
  }
  return null;
};

// Initialize a new worker
const setUpEmailWorker = (emailJobProcessor) => {
  const worker = () => {
    if (enableQueue) {
      return new Worker(
        'emailQueue',
        emailJobProcessor,
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
      logger.info(`Email job with ID ${job.id} has been completed.`);
    });

    workerInstance.on('failed', (job, err) => {
      logger.error(`Email job with ID ${job.id} has failed with error: ${err.message}`);
    });
  }
};

const emailProcessor = async (job) => {
  // Process the job data
  const transporter = nodemailer.createTransport({
    host: ehost,
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

setUpEmailWorker(emailProcessor);

const REPORT_REMOVE_CONFIG = {
  removeOnComplete: {
    age: 3600,
  },
  removeOnFail: {
    age: 24 * 3600,
  },
};

const setUpReportQueue = () => {
  if (enableQueue) {
    logger.info('report queue enabled');
    return new Queue('reportQueue', {
      connection: {
        host,
        port,
      },
    });
  }
  logger.info('report queue not enabled');
  return null;
};

const reportQueue = setUpReportQueue();

const addJobToReportQueue = async (data, jobId) => {
  if (reportQueue) {
    logger.info('adding report to queue');
    REPORT_REMOVE_CONFIG.jobId = jobId;
    return reportQueue.add('job', data, REPORT_REMOVE_CONFIG);
  }
  return null;
};

const retrieveJobFromReportQueue = async (jobId) => {
  if (reportQueue) {
    logger.info(`retrieving job ${jobId} from report queue`);
    const jobState = await reportQueue.getJobState(jobId);
    if (jobState === 'failed') {
      const job = await reportQueue.getJob(jobId);
      return {state: jobState, failedReason: job.failedReason};
    }
    return {state: jobState};
  }
  return null;
};

// Initialize a new worker
const setUpReportWorker = (reportJobProcessor) => {
  const worker = () => {
    if (enableQueue) {
      return new Worker(
        'reportQueue',
        reportJobProcessor,
        {connection: {
          host,
          port,
        },
        autorun: true},
      );
    }
    return null;
  };

  const workerInstance = worker();
  if (workerInstance) {
    workerInstance.on('completed', async (job) => {
      await job.remove();
      logger.info(`Report job with ID ${job.id} has been completed.`);
    });

    workerInstance.on('failed', (job, err) => {
      logger.error(`Report job with ID ${job.id} has failed with error: ${err.message}`);
    });
  }
};

const reportProcessor = async (job) => {
  // Process the job data
  logger.info(`processing report: ${job.id}`);
  await createReport(job.data);
};

setUpReportWorker(reportProcessor);

module.exports = {addJobToEmailQueue, addJobToReportQueue, retrieveJobFromReportQueue};
