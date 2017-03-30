"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  ldapAuth = require(process.cwd() + '/app/libs/ldapAuth'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  bcrypt = require(process.cwd() + '/lib/bcrypt'),
  moment = require('moment'),
  _ = require('lodash'),
  validator = require('validator'),
  Q = require('q'),
  $jira = require(process.cwd() + '/app/api/jira'),
  crypto = require('crypto'),
  $https = require('https'),
  emailInUse = require(process.cwd() + '/app/libs/emailInUse');

// Route for authentication actions
router.route('/subtask')
  .post((req,res,next) => {

    // Create object structure
    let body = {
      fields: {
        parent: {
          key: req.body.ticket
        },
        project: {
          id: 10020 // Sequence Developers
        },
        summary: req.body.title,
        issuetype: {
          id: 5, // type 5 is subtask
          subtask: true
        },
        reporter: {
          key: req.user.username,
          name: req.user.username
        },
        priority: {
          id: "6" // Medium priority
        },
        labels: [
          "IPR-Client"
        ],
        description: req.body.description,
        components: [
          { id: "15950" }
        ]
      }
    };

    // Request options & settings
    let opts = {
      hostname: 'www.bcgsc.ca',
      path: '/jira/rest/api/2/issue',
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': "JSESSIONID="+ req.user.jiraToken
      }
    };

    // Create Request
    let jiraRequest = $https.request(opts, (jResult) => {

      let data = ""; // Chunked Data (in case)

      jResult.setEncoding('utf8');

      // On response data
      jResult.on('data', (d) => {
        data += d;
      });

      jResult.on('end', () => {
        res.set({'Content-Type': 'application/json'}).send(data);
      });

    });

    // Send body
    jiraRequest.write(JSON.stringify(body));

    // Catch Errors
    jiraRequest.on('error', (e) => {
      console.log('=================== ERROR ==============');
      console.log('JIRA request error', e);
      res.status(500).json({error: {message: 'Unable to create the ticket', data: e}});
    });

    // End Request
    jiraRequest.end();

  });

module.exports = router;

/**
 * Create authentication token
 *
 * @param user
 * @returns {*|promise|string}
 */
let createToken = (user, req) => {

  let deferred = Q.defer();

  // Good auth, create token.
  db.models.userToken.create({ user_id: user.id, userAgent: req.header('user-agent'), expiresAt: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS Z')}).then(
    (result) => {
      deferred.resolve(result.token);
    },
    (error) => {
      console.log('Unable to create token', error);
      deferred.reject(false);
    }
  );

  return deferred.promise;

};