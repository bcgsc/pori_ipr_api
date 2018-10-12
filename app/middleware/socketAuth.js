"use strict";

const fs            = require('fs');
const jwt           = require('jsonwebtoken');

const pubKey        = fs.readFileSync(process.cwd() + '/pubkey.pem');

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
   * @returns {Promise}
   */
  challenge() {
    return new Promise((resolve, reject) => {
      this.socket.on('authenticate', (msg) => {
        jwt.verify(msg.token, pubKey, {algorithms: ['RS256']}, (err, decoded) => {
          if(decoded === null || err !== null) {
            return reject({message: 'failed socket authentication'});
          }
          // All good
          this.socket.user = decoded;
          this.authenticated = true;
          console.log('Socket', this.socket.id, 'authenticated as', decoded.preferred_username + ' [' + msg.token + ']');

          this.io.sockets.connected[this.socket.id].emit('authenticated', {authenticated: true});
          return resolve(this.socket);
        });
      });
    })
  }


  /**
   * Wait for timeout and kill connection.
   *
   * Wait 2000 milliseconds for authentication message. Kill connection if it takes longer.
   *
   * @returns {Promise}
   */
  challengeTimeout() {
    setTimeout(() => {
      if(this.authenticated !== true) {
        this.socket.disconnect();
        console.log('Dropping authentication');
      }
    }, 2000);
  }
}

module.exports = SocketAuthentication;