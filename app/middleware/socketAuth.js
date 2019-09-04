const fs = require('fs');
const jwt = require('jsonwebtoken');

const nconf = require('../config');
const logger = require('../../lib/log');

const pubKey = fs.readFileSync(nconf.get('web:keyFile'));

class SocketAuthentication {
  /**
   * Take in Socket connection
   *
   * @param {object} socket - Current socket connection
   * @param {object} io - socket.io server
   */
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.authenticated = false;
  }


  /**
   * Wait for Socket Authentication Message
   *
   * @returns {Promise.<object>} - Returns the current authenticated socket connection
   */
  challenge() {
    logger.info(`Trying to connect socket: ${this.socket.id}`);
    return new Promise((resolve, reject) => {
      this.socket.on('authenticate', (msg) => {
        jwt.verify(msg.token, pubKey, {algorithms: ['RS256']}, (err, decoded) => {
          if (!decoded || err) {
            this.socket.disconnect();
            return reject(new Error('Failed socket authentication'));
          }
          // All good
          this.socket.user = decoded;
          this.authenticated = true;
          logger.info(`Socket ${this.socket.id} authenticated as ${decoded.preferred_username}`);

          this.io.sockets.connected[this.socket.id].emit('authenticated', {authenticated: true});
          return resolve(this.socket);
        });
      });
    });
  }
}

module.exports = SocketAuthentication;
