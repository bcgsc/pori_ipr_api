const queue = [];

const addJobToQueue = async (data) => {
  queue.push(data);
  console.log('WORKING');
  return queue;
};

module.exports = {addJobToQueue};
