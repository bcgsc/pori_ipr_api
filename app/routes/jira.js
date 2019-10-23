const express = require('express');
const $https = require('https');
const nconf = require('../config');

const logger = require('../../lib/log');

const router = express.Router({mergeParams: true});

// Route for authentication actions
router.route('/subtask')
  .post((req, res) => {
    // Create object structure
    const body = {
      fields: {
        parent: {
          key: req.body.ticket,
        },
        project: {
          id: 10020, // Sequence Developers
        },
        summary: req.body.title,
        issuetype: {
          id: 5, // type 5 is subtask
          subtask: true,
        },
        reporter: {
          key: req.user.username,
          name: req.user.username,
        },
        assignee: {
          name: '',
        },
        priority: {
          id: '6', // Medium priority
        },
        labels: [
          'IPR-Client',
        ],
        description: `${req.body.description}\n\n---- Automated Notification ----\n Notifying: [~bpierce]`,
        components: [
          {id: '15950'},
        ],
      },
    };

    const hostname = nconf.get('jira:hostname');
    const api = nconf.get('jira:api');
    const version = nconf.get('jira:version');

    // Request options & settings
    const opts = {
      hostname,
      path: `${api}/api/${version}/issue`,
      port: 443,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `JSESSIONID=${req.user.jiraToken}`,
      },
    };

    // Create Request
    const jiraRequest = $https.request(opts, (jResult) => {
      let data = ''; // Chunked Data (in case)

      jResult.setEncoding('utf8');

      // On response data
      jResult.on('data', (d) => {
        data += d;
      });

      jResult.on('end', () => {
        if (jResult.statusCode === 401) {
          return res.status(400).json({error: {message: 'The JIRA authtoken is stale and needs to be refreshed.', code: 'JiraAuthStale'}});
        }
        if (jResult.statusCode === 201) {
          return res.set({'Content-Type': 'application/json'}).send(data);
        }

        logger.info('=================== UNHANDLED ==============');
        logger.info('JIRA Response has no handler');
        logger.error(jResult, data);
        return res.status(500).json({error: {message: 'Something went wrong, and we\'re not sure what.', code: 'UnhandledJiraResponse'}});
      });
    });

    // Send body
    jiraRequest.write(JSON.stringify(body));

    // Catch Errors
    jiraRequest.on('error', (error) => {
      logger.info('=================== ERROR ==============');
      logger.error(`JIRA request error ${error}`);
      return res.status(500).json({error: {message: 'Unable to create the ticket', data: error}});
    });

    // End Request
    jiraRequest.end();
  });

module.exports = router;
