const {listen} = require('../app');

process.on('unhandledRejection', (reason, p) => {
  // fix for node 10: https://stackoverflow.com/questions/51632965/can-i-get-the-future-unhandled-promise-rejection-behaviour-now
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  process.exit(1);
});

listen()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
