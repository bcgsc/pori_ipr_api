const request = require('request-promise-native');
const nconf = require('nconf').argv().env().file({file: './config/config.json'});

const host = nconf.get('jira:hostname');
const base = nconf.get('jira:api');

// Base Request options object
const opts = {
  hostname: host,
  port: 443,
  headers: {
    'Content-Type': 'application/json',
  },
};

const $jira = {
  /**
   * Authenticate a user against the JIRA API
   *
   * @param {string} username a username to authenticate
   * @param {string} password a password to authenticate
   *
   * @return {Promise.<Object.<string, object>>} returns an object containing the raw body info.
   *                                             and the JSON parsed body info.
   */
  authenticate: async (username, password) => {

    // Define JIRA body
    const body = JSON.stringify({
      username,
      password,
    });

    // Endpoint
    opts.path = `${base}/auth/1/session`;
    opts.method = 'POST';
    opts.headers['Content-Length'] = Buffer.byteLength(body);

    const resp = await request(opts);
    return {raw: resp, data: JSON.parse(resp)};
  },
};

module.exports = $jira;
