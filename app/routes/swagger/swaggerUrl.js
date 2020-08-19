const CONFIG = require('../../../app/config');

const servers = {
  development: {
    url: 'https://iprdev-api.bcgsc.ca/api',
    description: 'Development server',
  },
  production: {
    url: 'https://ipr-api.bcgsc.ca/api',
    description: 'Production server (uses live data)',
  },
  staging: {
    url: 'https://iprstaging-api.bcgsc.ca/api',
    description: 'Staging server',
  },
  local: {
    url: 'http://localhost:8080/api',
    description: 'Localhost',
  },
};

let url;
const customUrl = CONFIG.get('swaggerUrl');

if (customUrl) {
  url = {
    url: customUrl,
    description: 'Server URL specified by user',
  };
} else {
  url = servers[CONFIG.get('env')];
}

module.exports = [url];
