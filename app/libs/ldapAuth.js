"use strict";

let Q = require('q'),
    ldap = require('ldap-client');

let client = new ldap({
  uri: 'ldap://gsc-ldap.bcgsc.ca:389',
  validatecert: false,
  connect: (err) => {
    if(err) console.log('Connection Error: ', err);
    console.log('Connected to LDAP');
  }
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

    try {
      // Attempt LDAP bind
      client.bind({
        binddn: 'uid=' + user + ',ou=Webusers,dc=bcgsc,dc=ca',
        password: pass
      }, (err) => {

        if (err) {
          deferred.reject({status: false, message: 'invalid credentials'});
        }
        if (!err) {
          console.log('Successful LDAP auth');
          deferred.resolve({status: true, message: 'success'});
        }
      });
    } catch(error) {
      console.log('Unable to attempt LDAP auth');
      deferred.reject({status: false, message: 'unable to authenticate'});
    }

    return deferred.promise;
  }
};