const {listen} = require('../app');

listen()
  .catch((err) => {
    console.error(err);
    return process.exit(1);
  });
