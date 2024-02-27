const queue = []

const addJobToQueue = async (data) => {
  queue.push(data)
  return queue
};

module.exports = {addJobToQueue};
