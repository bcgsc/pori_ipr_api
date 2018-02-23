"use strict";

const moment        = require('moment');
const _             = require('lodash');
const db            = require(process.cwd() + '/app/models/');
const redis         = require('redis');

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

        // Validate token
        db.models.userToken.findOne({
          where: { token: msg.token },
          include: [{model: db.models.user, as: 'user', attributes: {exclude: ['password', 'deletedAt']}}]
        }).then(
          (result) => {

            if(result === null) return reject({message: 'failed socket authentication'});
            // All good
            this.socket.user = result.user;
            this.authenticated = true;

            console.log('Socket', this.socket.id, 'authenticated as', result.user.username + ' [' + msg.token + ']');

            this.io.sockets.connected[this.socket.id].emit('authenticated', {authenticated: true});

            resolve(this.socket);

            // Socket Registered! -- Need to store user structure in Redis
          },
          (err) => {
            console.log(err);
            reject({message: 'failed socket authentication'});
          }
        )
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