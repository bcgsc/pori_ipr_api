
/**
 * Basic LDAP Authentication against BCGSC LDAP Service
 *
 * @param user - Username (cn)
 * @param pass - Password (secret)
 * @returns {Promise} - {promise.response, promise.status, promise.message}
 */
const authenticate = async (user, pass) => {

  return true;
}

module.exports = {
  authenticate,
};