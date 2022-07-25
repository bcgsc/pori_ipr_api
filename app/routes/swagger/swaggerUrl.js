const CONFIG = require('../../config');

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
    url: `http://${process.env.HOSTNAME || 'localhost'}:${CONFIG.get('web:port')}/api`,
    description: 'Localhost',
  },
};

let url;
const customUrl = CONFIG.get('swagger:url');

// Set URL to custom if defined
if (customUrl) {
  url = {
    url: customUrl,
    description: 'Custom server url',
  };
// If URL is not defined, set it based on the enviroment
} else {
  url = servers[CONFIG.get('env')];
}

module.exports = [url];
