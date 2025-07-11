const {Queue, Worker} = require('bullmq');
const nodemailer = require('nodemailer');
const {graphkbGetReadonlyGroupId, graphkbAddUser} = require('./api/graphkb');
const conf = require('./config');
const createReport = require('./libs/createReport');
const db = require('./models');
const {sendEmail} = require('./libs/email');

const {host, port, enableQueue} = conf.get('redis_queue');
const logger = require('./log');
const CONFIG = require('./config');

const {email, password, ehost, failemail} = CONFIG.get('email');

let emailQueue = null;
let reportQueue = null;
let graphkbNewUserQueue = null;

const EMAIL_REMOVE_CONFIG = {
  removeOnComplete: {age: 3600},
  removeOnFail: {age: 86400},
  attempts: 10,
};

const REPORT_REMOVE_CONFIG = {
  removeOnComplete: {age: 3600},
  removeOnFail: {age: 86400},
};

const GRAPHKB_REMOVE_CONFIG = {
  removeOnComplete: {age: 3600},
  removeOnFail: {age: 86400},
  attempts: 3,
};

const addJobToEmailQueue = async (data) => {
  if (!emailQueue) return null;
  logger.info('adding email to queue: ', data);
  const job = await emailQueue.add('job', data, EMAIL_REMOVE_CONFIG);
  try {
    await db.models.notificationTrack.create({
      notificationId: data.notifId,
      jobId: job.id,
      recipient: data.mailOptions.to,
      reason: data.eventType,
      outcome: 'created',
    });
  } catch (error) {
    logger.error(`Unable to create notification track ${error}`);
    throw new Error(error);
  }
  return job;
};

const onEmailWorkerCompleted = async (job) => {
  try {
    const notification = await db.models.notificationTrack.findOne({
      where: {notificationId: job.data.notifId, jobId: job.id},
    });
    await notification.update({outcome: 'completed'});
  } catch (error) {
    logger.error(`Unable to create notification track ${error}`);
    throw new Error(error);
  }
};

const onEmailWorkerFailed = async (job) => {
  try {
    const notification = await db.models.notificationTrack.findOne({
      where: {notificationId: job.data.notifId, jobId: job.id},
    });
    await notification.update({outcome: 'failed'});
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

const setUpEmailWorker = (emailJobProcessor) => {
  if (!enableQueue) return;
  const worker = new Worker('emailQueue', emailJobProcessor, {
    connection: {host, port},
    autorun: true,
    limiter: {max: 10, duration: 60000},
  });
  worker.on('completed', async (job) => {
    await onEmailWorkerCompleted(job);
    await job.remove();
    logger.info(`Email job with ID ${job.id} has been completed.`);
  });
  worker.on('failed', async (job, err) => {
    await onEmailWorkerFailed(job);
    logger.error(`Email job with ID ${job.id} has failed with error: ${err.message}`);
  });
};

const emailProcessor = async (job) => {
  const transporter = nodemailer.createTransport({
    host: ehost,
    auth: {user: email, pass: password},
    tls: {rejectUnauthorized: false},
  });
  try {
    await transporter.sendMail(job.data.mailOptions);
  } catch (err) {
    logger.error(JSON.stringify(job.data.mailOptions));
    throw new Error(err);
  }
};

const addJobToReportQueue = async (data, jobId) => {
  if (!reportQueue) return null;
  logger.info('adding report to queue');
  REPORT_REMOVE_CONFIG.jobId = jobId;
  return reportQueue.add('job', data, REPORT_REMOVE_CONFIG);
};

const retrieveJobFromReportQueue = async (jobId) => {
  if (!reportQueue) return null;
  logger.info(`retrieving job ${jobId} from report queue`);
  const jobState = await reportQueue.getJobState(jobId);
  if (jobState === 'failed') {
    const job = await reportQueue.getJob(jobId);
    return {state: jobState, failedReason: job.failedReason};
  }
  return {state: jobState};
};

const setUpReportWorker = (reportJobProcessor) => {
  if (!enableQueue) return;
  const worker = new Worker('reportQueue', reportJobProcessor, {
    connection: {host, port},
    autorun: true,
  });
  worker.on('completed', async (job) => {
    await job.remove();
    logger.info(`Report job with ID ${job.id} has been completed.`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`Report job with ID ${job.id} has failed with error: ${err.message}`);
  });
};

const reportProcessor = async (job) => {
  logger.info(`processing report: ${job.id}`);
  await createReport(job.data);
};

const addJobToGraphkbNewUserQueue = async (data) => {
  if (!graphkbNewUserQueue) return null;
  logger.info('adding graphkb new user to queue: ', data.body);
  return graphkbNewUserQueue.add('job', data, GRAPHKB_REMOVE_CONFIG);
};

const setUpGraphkbNewUserWorker = (graphkbJobProcessor) => {
  if (!enableQueue) return;
  const worker = new Worker('graphkbNewUserQueue', graphkbJobProcessor, {
    connection: {host, port},
    autorun: true,
  });
  worker.on('completed', async (job) => {
    await job.remove();
    logger.info(`Graphkb new user job with ID ${job.id} has been completed.`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`Graphkb new user job with ID ${job.id} has failed with error: ${err.message}`);
  });
};

const graphkbNewUserProcessor = async (job) => {
  try {
    const groupId = await graphkbGetReadonlyGroupId(job.data.graphkbToken);
    const addUser = await graphkbAddUser(
      job.data.graphkbToken,
      job.data.body.username,
      job.data.body.email,
      groupId.result[0]['@rid'],
    );
    if (!addUser.result) {
      throw new Error(`Error adding new user to GraphKb: ${addUser}`);
    }
  } catch (err) {
    logger.error(JSON.stringify(job.data.body));
    throw new Error(err);
  }
};

const setupQueues = function () {
  if (!enableQueue) return null;

  logger.info('Setting up all queues...');

  emailQueue = new Queue('emailQueue', {connection: {host, port}});
  reportQueue = new Queue('reportQueue', {connection: {host, port}});
  graphkbNewUserQueue = new Queue('graphkbNewUserQueue', {connection: {host, port}});

  setUpEmailWorker(emailProcessor);
  setUpReportWorker(reportProcessor);
  setUpGraphkbNewUserWorker(graphkbNewUserProcessor);

  return ([
    emailQueue,
    reportQueue,
    graphkbNewUserQueue,
  ]);
};

module.exports = {
  setupQueues,
  addJobToEmailQueue,
  addJobToReportQueue,
  addJobToGraphkbNewUserQueue,
  retrieveJobFromReportQueue,
};
