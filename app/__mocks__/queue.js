const queue = [];

const addJobToEmailQueue = async (data) => {
  queue.push(data);
  return queue;
};

module.exports = {addJobToEmailQueue};
