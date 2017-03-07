"use strict";

let db = require('../models/'),
    Q = require('q');

/**
 * Check if an email address is in use.
 *
 * @param email
 * @returns {*|promise|boolean}
 */
module.exports = (email) => {
  let deferred = Q.defer();
  db.models.user.findAll({where: {email: email}}).then(
    (res) => {
      if(res.length > 0) deferred.resolve(true);
      if(res.length < 1) deferred.resolve(false);
    },
    (err) => {
      console.log('EmaiLInUse Failed', err);
      deferred.reject({status: false, message: 'Unable to lookup email in use status of: ' + email});
    }
  );
  return deferred.promise;
};