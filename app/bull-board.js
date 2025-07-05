const {ExpressAdapter} = require('@bull-board/express');
const {createBullBoard} = require('@bull-board/api');
const {BullMQAdapter} = require('@bull-board/api/bullMQAdapter');

const BULL_BOARD_BASE_PATH = '/admin/queues';

const setupBullBoard = ({app, queues}) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

  const validQueues = queues.filter(Boolean).map((q) => {return new BullMQAdapter(q);});

  createBullBoard({
    queues: validQueues,
    serverAdapter,
  });

  app.use(BULL_BOARD_BASE_PATH, serverAdapter.getRouter());
};

module.exports = {setupBullBoard};
