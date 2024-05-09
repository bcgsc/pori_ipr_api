const createReport = require('../libs/createReport');

const queue = [];

const addJobToEmailQueue = async (data) => {
  queue.push(data);
  return queue;
};

const addJobToReportQueue = async (data, customIdent) => {
  await createReport(data);
  return {id: customIdent};
};

module.exports = {addJobToEmailQueue, addJobToReportQueue};
