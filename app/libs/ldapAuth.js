
/**
 * !! Need to add actual Authentication or delete file !!
 *
 * Basic LDAP Authentication against BCGSC LDAP Service
 *
 * @param {object} username - Username (cn)
 * @param {string} password - Password (secret)
 * @returns {Promise.<boolean>} - Returns true if the authentication was successful
 */
const authenticate = async (username, password) => {
  return true;
};

module.exports = {
  authenticate,
};
