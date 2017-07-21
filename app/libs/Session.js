"use strict";

const _         = require('lodash');
const db        = require(process.cwd() + '/app/models');
const $jira     = require(process.cwd() + '/app/api/jira');
const crypto    = require('crypto');
const bcrypt    = require(process.cwd() + '/lib/bcrypt');
const moment    = require('moment');



class Session {

  /**
   * New Session Instance
   *
   * @param {string} usernameOrToken - Username to be authenticated
   * @param {string} password - Password
   * @param {object} request - Express request object (required for token creation)
   * @param {object} opts - Additional options (include soft-deletes)
   */
  constructor(usernameOrToken, password, request, opts={}) {
    this.username = (!usernameOrToken.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) ? usernameOrToken : null;
    this.password = password;

    this.request = request;

    this.noToken = (opts.noToken);
    this.token = (usernameOrToken.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) ? usernameOrToken : null;
    this.softDeletes = (opts.softDeletes);
  }

  /**
   * Authenticate User Session
   *
   * Authenticate a user's session against BCGSC or Local DB
   *
   * @returns {Promise} - Resolves with object: {user: {db.models.user instance} , token: {string}}
   */
  authenticate () {

    return new Promise((resolve, reject) => {
      this._getUser()
        .then(this._auth.bind(this))
        .then(this._createToken.bind(this))
        .then(
          (result) => {
            resolve({user: this.user, token: this.token});
          },
          (err) => {
            console.log('Authentication pipe failed', err);
            reject({message: 'Unable to authenticate'});
          }
        )
        .catch((e) => {
          if(e.constructor.name === 'UserNotFound') {
            reject({message: 'Unable to find a user with the provided credentials', code: 'userNotFound'});
          }
          reject({message: 'Unable to authenticate', code: 'failedAuthentication'});
        });
    });

  }

  /**
   * Retrieve user from database
   *
   * @private
   * @returns {Promise} - Resolves with {db.models.user instance}
   */
  _getUser () {
    return new Promise((resolve, reject) => {

      let opts = {
        where: {username: this.username}
      };
      // Include soft-deleted items?
      if(this.softDeletes) opts.paranoid = true;

      db.models.user.findOne(opts).then(
        (result) => {
          if(result === null) throw new UserNotFound('unable to find requested user', 'userNotFound');

          this.user = result;
          resolve(result);

        },
        (err) => {
          console.log('Unable to query the user for session authentication', err);
          throw new UserNotFound('Unable to query for user', 'userNotFound');
        }
      )
    });
  }


  /**
   * Attempt to authenticate the user with provided credentials
   *
   * @returns {Promise} - Resolves with user token
   * @private
   */
  _auth () {
    return new Promise((resolve, reject) => {

      // Authentication Driver
      switch(this.user.type){
        case 'bcgsc':
          this._bcgscAuth()
            .then(this._createToken.bind(this))
            .then(
              (result) => {
                if(result === false) reject({message: 'Unable to authenticate with provided credentials'});
                resolve(result);
              },
              (err) => {

                reject({message: 'Unable to authenticate with provided credentials'});
              }
            )
            .catch((e) => {
              console.log('Failed bcgsc authentication driver', e);
              reject({message: 'Unable to authenticate with the provided credentials'});
            });
          break;
        case 'local':

          this._localAuth()
            .then(this._createToken.bind(this))
            .then(
              (result) => {
                if(resolve === false) reject({message: 'Unable to authenticate with provided credentials'});
                resolve(result);

              },
              (err) => {
                reject({message: 'Unable to authenticate with provided credentials'});
              }
            )
            .catch((e) => {
              console.log('Failed local authentication driver', e);
              reject({message: 'Unable to authenticate with the provided credentials'});
            });
          break;
      }

    });
  }



  /**
   * Authenticate against BCGSC JIRA
   *
   */
  _bcgscAuth () {

    return new Promise((resolve, reject) => {

      // Attempt BCGSC LDAP Authentication
      if(this.user.type === 'bcgsc') {

        $jira.authenticate(this.username, this.password).then(
          (resp) => {

            // Ensure we have a real JIRA token -- Successful Login
            if(!resp.data.errorMessages && resp.data.session && resp.data.session.value) {

              // Extract cookie values
              let cookies = resp.raw.headers["set-cookie"];
              let xsrf, jToken;
              _.forEach(cookies, (c) => {
                // get tokens from headers
                if(c.indexOf('JSESSIONID') !== -1) jToken = c.match(/=([A-z0-9-|]*)/)[0].replace('=','');
              });

              // Update User Entry
              this.user.jiraXsrf = xsrf;
              this.user.jiraToken = jToken;
              this.user.save(); // Save Changes to User;

              // Successful authentication
              resolve(this.user);

            } else {
              reject({message: 'Unable to authenticate with the provided credentials'});
              throw new FailedAuthentication('Unable to authenticate with the provided credentials', 'failedAuthentication');
            }
          },
          (err) => {
            console.log('Authentication query failed', err);
            reject({message: 'Unable to authenticate with the provided credentials'});
            throw new FailedAuthentication('Unable to authenticate with the provided credentials', 'failedAuthentication');
          }
        );

      } // End attempt BCGSC LDAP Auth

    });

  }

  /**
   * Authenticate against local PostGres DB
   *
   */
  _localAuth() {
    return new Promise((resolve, reject) => {
      // Check password hashing
      if(bcrypt.compareSync(this.password, this.user.password)) {

        resolve(this.user);
      } else {
        throw new FailedAuthentication('Unable to authenticate with the provided credentials', 'failedAuthentication');
      }
    });
  }


  /**
   * Create an authentication token
   *
   * @returns {Promise} - Resolves with token
   * @private
   */
  _createToken() {

    return new Promise((resolve, reject) => {

      // Good auth, create token.
      db.models.userToken.create({ user_id: this.user.id, userAgent: this.request.header('user-agent'), expiresAt: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS Z')}).then(
        (result) => {
          this.token = result.token;
          resolve(result.token);
        },
        (error) => {
          console.log('Unable to create token', error);
          reject(false);
        }
      );
    });
  }

  /**
   * Validate a provided token
   *
   * @returns {Promise}
   */
  validateToken() {
    return new Promise((resolve, reject) => {

      db.models.userToken.findOne({
        where: {token: token},
        include: [{
          model: db.models.user, as: 'user', attributes: {exclude: ['password', 'deletedAt']}, include: [
            {
              model: db.models.userGroup,
              as: 'groups',
              attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}
            }
          ]
        }]
      })
        .then(
        (result) => {

          if (result === null) return reject({message: 'Invalid authorization token'});

          // Token has expired!
          if (moment(result.expiresAt).diff(moment(), 'seconds') < 0 && !result.permanentToken) {
            result.destroy();
            return reject({message: 'Invalid authorization token'});
          }

          // Refresh the token if it's more than 1 hour old.
          if (moment(result.expiresAt).diff(moment(), 'seconds') < 82800 && !result.permanentToken) {
            result.expiresAt = moment().add(24, 'hours');
            result.save();
          }

          if (result.token) {
            db.models.user.update({lastLogin: db.fn('NOW')}, {where: {ident: result.user.ident}});

            resolve(result);
          } else {
            console.log('Failed token validation - unknown reason', result);
            reject({message: 'Invalid authorization token'});
          }
        },
        (err) => {
          console.log('Failed token validation lookup', err);
          reject({message: 'failed to query to validate token'});
        }
      )


    });
  }


}


/** Exceptions **/

class UserNotFound extends Error {
  constructor(message, code) {
    super(message);
    this.message = message;
    this.code = code;
  }
}

class FailedAuthentication extends Error {
  constructor(message, code) {
    super(message);
    this.message = message;
    this.code = code;
  }
}

module.exports = Session;