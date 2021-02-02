const {listen} = require('../app');

listen()
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
