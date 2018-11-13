"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  moment = require('moment'),
  _ = require('lodash'),
  Q = require('q'),
  $jira = require(process.cwd() + '/app/api/jira'),
  crypto = require('crypto'),
  $https = require('https');

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
        assignee: {
          name: ""
        },
        priority: {
          id: "6" // Medium priority
        },
        labels: [
          "IPR-Client"
        ],
        description: req.body.description + "\n\n---- Automated Notification ----\n Notifying: [~bpierce]",
        components: [
          { id: "15950" }
        ]
      }
    };

    //res.status(400).json({error: {message: "The JIRA authtoken is stale and needs to be refreshed.", code: "JiraAuthStale"}});
    //return;

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

        if(jResult.statusCode === 401) {
          return res.status(400).json({error: {message: "The JIRA authtoken is stale and needs to be refreshed.", code: "JiraAuthStale"}});
        }
        if(jResult.statusCode === 201) {
          return res.set({'Content-Type': 'application/json'}).send(data);
        }

        console.log('=================== UNHANDLED ==============');
        console.log('JIRA Response has no handler');
        console.log(jResult, data);
        return res.status(500).json({error: {message: "Something went wrong, and we're not sure what.", code: "UnhandledJiraResponse"}});
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