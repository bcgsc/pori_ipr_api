const createReport = require('../libs/createReport');

const emailQueue = [];
const gkbQueue = [];

const addJobToEmailQueue = async (data) => {
  emailQueue.push(data);
  return emailQueue;
};

const addJobToReportQueue = async (data, customIdent) => {
  await createReport(data);
  return {id: customIdent};
};

const addJobToGraphkbNewUserQueue = async (data) => {
  gkbQueue.push(data);
  return gkbQueue;
};

module.exports = {addJobToEmailQueue, addJobToReportQueue, addJobToGraphkbNewUserQueue};
