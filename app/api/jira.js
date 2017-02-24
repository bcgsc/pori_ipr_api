"use strict";

let https = require('https'),
    db = require(process.cwd() + '/app/models'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});


const host = nconf.get('jira:hostname');
const base = nconf.get("jira:api");
const version = nconf.get("jira:version");

// Base Request options object
let opts = {
  hostname: host,
  port: 443,
  headers: {
    'Content-Type': 'application/json'
  }
};

let $jira = {

  /**
   * Authenticate a user against the JIRA API
   *
   * @param {string} username
   * @param {string} password
   *
   * @return {*|promise|string}
   */
  authenticate: (username, password) => {

    return new Promise((resolve, reject) => {

      // Define JIRA body
      let body = JSON.stringify({
        "username": username,
        "password": password
      });

      // Endpoint
      opts.path = base + '/auth/1/session';
      opts.method = 'POST';
      opts.headers['Content-Length'] = Buffer.byteLength(body);

      // Open request to API
      let req = https.request(opts, (res) => {
        let data = "";

        // On data
        res.on('data', (chunk) => {
          data += chunk;
        });

        // On end
        res.on('end', (resp) => {
          resolve(JSON.parse(data));
        });

      });

      // Write POST data to API
      req.write(body);
      req.end();

      // Error Handling
      req.on('error', (error) => {
        console.log('[JIRA][API] Error', error);
        reject({status: false, message: 'Unable to complete JIRA API request'});
      });


    });
  }

};

module.exports = $jira;