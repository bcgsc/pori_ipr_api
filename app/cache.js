const Redis = require('ioredis');
const conf = require('./config');

const {host, port} = conf.get('redis');

const cache = new Redis({
  host,
  port,
});

module.exports = cache;
