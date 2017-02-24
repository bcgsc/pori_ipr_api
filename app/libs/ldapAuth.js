"use strict";

let Q = require('q');



module.exports = {

  /**
   * Basic LDAP Authentication against BCGSC LDAP Service
   *
   * @param user - Username (cn)
   * @param pass - Password (secret)
   * @returns {promise.response, promise.status, promise.message}
   */
  authenticate: (user, pass) => {

    let deferred = Q.defer();

    return deferred.promise;
  }
};