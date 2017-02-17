"use strict";

let Q = require('q'),
    ldap = require('ldapjs'),
    client = ldap.createClient({
      url: 'ldap://gsc-ldap.bcgsc.ca:389/ou=Webusers,dc=bcgsc,dc=ca?uid?sub'
    });

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

    // Attempt LDAP bind
    client.bind('cn='+user, pass, (err, resp) => {
      console.log(err);
      if(err) deferred.reject({status: false, message: 'Unable to authenticate', response: err}); // If error reject
      if(!err) deferred.resolve({status:true, message: 'Authenticated', response: true}); // Success
    });

    return deferred.promise;
  }
};