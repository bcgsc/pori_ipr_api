const createReport = require('../libs/createReport');

const queue = [];
const graphKbQueue = [];

const addJobToEmailQueue = async (data) => {
  queue.push(data);
  return queue;
};

const addJobToReportQueue = async (data, customIdent) => {
  await createReport(data);
  return {id: customIdent};
};

const addJobToGraphkbNewUserQueue = async (data) => {
  graphKbQueue.push(data);
  return graphKbQueue;
};

module.exports = {addJobToEmailQueue, addJobToReportQueue, addJobToGraphkbNewUserQueue};
