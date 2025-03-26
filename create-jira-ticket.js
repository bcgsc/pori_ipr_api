/* eslint-disable @typescript-eslint/no-var-requires */
const https = require('https');

function createJiraTicket() {
  const options = {
    method: 'POST',
    host: process.env.JIRA_BASE_URL,
    port: process.env.JIRA_PORT,
    path: '/jira/rest/api/2/issue/',
    headers: {
      Authorization: `Bearer ${process.env.JIRA_API_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const issueData = JSON.stringify({
    fields: {
      project: {
        key: process.env.JIRA_PROJECT_NAME,
      },
      summary: process.env.PR_TITLE,
      description: process.env.PR_DESCRIPTION,
      issuetype: {
        name: process.env.JIRA_ISSUE_TYPE,
      },
    },
  });

  const req = https.request(options, (res) => {
    res.setEncoding('utf8');
    res.on('data', (body) => {
      console.log('Body:', body);
    });
  });

  req.on('error', (e) => {
    console.error('problem with request:', e.message);
  });

  req.write(issueData);
  req.end();
}

createJiraTicket();
