const fs = require('fs');
const jwt = require('jsonwebtoken');

const {logger} = process;
const pubKey = ['production', 'development', 'test'].includes(process.env.NODE_ENV)
  ? fs.readFileSync('keys/prodkey.pem')
  : fs.readFileSync('keys/devkey.pem');

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

    this.challengeTimeout();
  }


  /**
   * Wait for Socket Authentication Message
   *
   * @returns {Promise.<object>} - Returns the current authenticated socket connection
   */
  async challenge() {
    this.socket.on('authenticate', (msg) => {
      const decoded = jwt.verify(msg.token, pubKey, {algorithms: ['RS256']});
      if (!decoded) {
        throw new Error('Failed socket authentication');
      }
      // All good
      this.socket.user = decoded;
      this.authenticated = true;
      logger.info(`Socket ${this.socket.id} authenticated as ${decoded.preferred_username}`);

      this.io.sockets.connected[this.socket.id].emit('authenticated', {authenticated: true});
      return this.socket;
    });
  }


  /**
   * Wait for timeout and kill connection.
   *
   * Wait 2000 milliseconds for authentication message. Kill connection if it takes longer.
   *
   * @returns {undefined}
   */
  challengeTimeout() {
    setTimeout(() => {
      if (!this.authenticated) {
        this.socket.disconnect();
        logger.info('Dropping authentication');
      }
    }, 2000);
  }
}

module.exports = SocketAuthentication;
