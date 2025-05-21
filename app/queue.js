const {Queue, Worker} = require('bullmq');
const nodemailer = require('nodemailer');
const {graphkbGetReadonlyGroupId, graphkbAddUser} = require('./api/graphkb');
const conf = require('./config');
const createReport = require('./libs/createReport');
const db = require('./models');
const {sendEmail} = require('./libs/email');

const {host, port, enableQueue} = conf.get('redis_queue');
const logger = require('./log'); // Load logging library

const CONFIG = require('./config');

const {email, password, ehost, failemail} = CONFIG.get('email');

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
    const job = await emailQueue.add('job', data, EMAIL_REMOVE_CONFIG);
    try {
      await db.models.notificationTrack.findOrCreate({where: {
        notificationId: data.notifId,
        jobId: job.id,
        recipient: data.mailOptions.to,
        reason: data.eventType,
        outcome: 'created',
      }});
    } catch (error) {
      logger.error(`Unable to create notification track ${error}`);
      throw new Error(error);
    }
    return job;
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
      await onEmailWorkderCompleted(job);
      await job.remove();
      logger.info(`Email job with ID ${job.id} has been completed.`);
    });

    workerInstance.on('failed', async (job, err) => {
      await onEmailWorkderFailed(job);
      logger.error(`Email job with ID ${job.id} has failed with error: ${err.message}`);
    });
  }
};

const onEmailWorkderCompleted = async (job) => {
  try {
    const notification = await db.models.notificationTrack.findOne({
      where: {
        notificationId: job.data.notifId,
        jobId: job.id,
      },
    });
    await notification.update({
      outcome: 'completed',
    });
  } catch (error) {
    logger.error(`Unable to create notification track ${error}`);
    throw new Error(error);
  }
};

const onEmailWorkderFailed = async (job) => {
  try {
    const notification = await db.models.notificationTrack.findOne({
      where: {
        notificationId: job.data.notifId,
        jobId: job.id,
      },
    });
    await notification.update({
      outcome: 'failed',
    });
  } catch (error) {
    logger.error(`Unable to create notification track ${error}`);
    throw new Error(error);
  }

  try {
    if (failemail) {
      await sendEmail('Notification failed', job.data, failemail);
    }
  } catch (error) {
    logger.error(`Unable to send email ${error}`);
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
    await transporter.sendMail(job.data.mailOptions);
  } catch (err) {
    logger.error(JSON.stringify(job.data.mailOptions));
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

const setUpGraphkbNewUserQueue = () => {
  if (enableQueue) {
    logger.info('graphkb new user queue enabled');
    return new Queue('graphkbNewUserQueue', {
      connection: {
        host,
        port,
      },
    });
  }
  logger.info('graphkb new user queue not enabled');
  return null;
};

const graphkbNewUserQueue = setUpGraphkbNewUserQueue();

const GRAPHKB_REMOVE_CONFIG = {
  removeOnComplete: {
    age: 3600,
  },
  removeOnFail: {
    age: 24 * 3600,
  },
  attempts: 3,
};

const addJobToGraphkbNewUserQueue = async (data) => {
  if (graphkbNewUserQueue) {
    logger.info('adding graphkb new user to queue: ', data.body);
    return graphkbNewUserQueue.add('job', data, GRAPHKB_REMOVE_CONFIG);
  }
  return null;
};

// Initialize a new worker
const setUpGraphkbNewUserWorker = (graphkbJobProcessor) => {
  const worker = () => {
    if (enableQueue) {
      return new Worker(
        'graphkbNewUserQueue',
        graphkbJobProcessor,
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
      logger.info(`Graphkb new user job with ID ${job.id} has been completed.`);
    });

    workerInstance.on('failed', (job, err) => {
      logger.error(`Graphkb new user job with ID ${job.id} has failed with error: ${err.message}`);
    });
  }
};

const graphkbNewUserProcessor = async (job) => {
  // Process the job data
  try {
    const groupId = await graphkbGetReadonlyGroupId(job.data.graphkbToken);
    const addUser = await graphkbAddUser(job.data.graphkbToken, job.data.body.username, job.data.body.email, groupId.result[0]['@rid']);
    if (!addUser.result) {
      throw new Error(`Error adding new user to GraphKb: ${addUser}`);
    }
  } catch (err) {
    logger.error(JSON.stringify(job.data.body));
    throw new Error(err);
  }
};

setUpGraphkbNewUserWorker(graphkbNewUserProcessor);

module.exports = {addJobToEmailQueue, addJobToReportQueue, addJobToGraphkbNewUserQueue, retrieveJobFromReportQueue};
