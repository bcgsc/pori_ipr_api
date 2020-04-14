const nconf = require('nconf');
const { merge } = require('lodash');


const ENV = process.env.NODE_ENV || 'local';

// set the default db name based on the node-env
let DEFAULT_DB_NAME = 'ipr-sync-dev';

if (ENV === 'production') {
  DEFAULT_DB_NAME = 'ipr';
} else if (ENV === 'staging') {
  DEFAULT_DB_NAME = 'ipr-sync-staging';
}

let DEFAULT_LOG_LEVEL = 'debug';
if (ENV === 'production') {
  DEFAULT_LOG_LEVEL = 'info';
} else if (ENV === 'test') {
  DEFAULT_LOG_LEVEL = 'warn';
}

const DEFAULT_TEST_USER = 'ipr-bamboo-admin';

const DEFAULTS = {
  env: ENV,
  web: {
    port: 8080,
    ssl: '/etc/ssl/certs/current/combinedcert.cert',
  },
  keycloak: {
    uri: ENV === 'production'
      ? 'https://sso.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token'
      : 'https://keycloakdev01.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token',
    clientId: 'IPR',
    role: 'IPR',
    keyFile: ENV === 'production'
      ? 'keys/prodkey.pem'
      : 'keys/devkey.pem',
  },
  graphkb: {
    uri: ENV === 'production'
      ? 'https://graphkb-api.bcgsc.ca/api'
      : 'https://graphkbstaging-api.bcgsc.ca/api',
    username: 'ipr_gkb_link',
  },
  testing: {
    username: DEFAULT_TEST_USER,
  },
  log: {
    level: DEFAULT_LOG_LEVEL,
  },
  database: {
    engine: 'postgres',
    schema: 'public',
    prefix: '',
    username: 'ipr_service',
    hostname: ENV === 'production'
      ? 'seqdevdb01.bcgsc.ca'
      : 'iprdevdb.bcgsc.ca',
    port: 5432,
    name: DEFAULT_DB_NAME,
  },
  redis: {
    uri: '',
    host: '',
    port: 6379,
  },
  paths: {
    data: {
      POGdata: '/projects/tumour_char/pog/reports/genomic',
      dataDir: '/P*/jreport_genomic_summary_*/report',
      reportRoot: '/P*/jreport_genomic_summary_*/',
      probeData: '/projects/tumour_char/pog/reports/probing',
      probeDir: '/P*/jreport_genomic_summary_v*/',
    },
  },
};

const processEnvVariables = (env = process.env, opt = {}) => {
  const { lowerCase = true, separator = '_' } = opt;
  // pre-process env variables (transform doesn't actually work in nconf)
  const processed = {};

  for (const [key, value] of Object.entries(env)) {
    let newKey = key;

    if (/^ipr_\w+$/i.exec(key)) {
      if (lowerCase) {
        newKey = newKey.toLowerCase();
      }
      let parent = processed;
      // create the heirarchy
      const keys = newKey.split(separator);
      // remove the ipr prefix
      for (const subkey of keys.slice(1, keys.length - 1)) {
        if (parent[subkey] === undefined) {
          parent[subkey] = {};
        }
        parent = parent[subkey];
      }

      parent[keys[keys.length - 1]] = value;
    }
  }
  return processed;
};


const argv = {};
Object.entries(DEFAULTS.database, ([key, value]) => {
  argv[`database.${key}`] = { alias: `database:${key}`, default: value, parseValues: true };
});
Object.entries(DEFAULTS.keycloak, ([key, value]) => {
  argv[`keycloak.${key}`] = { alias: `keycloak:${key}`, default: value, parseValues: true };
});


const CONFIG = nconf
  .argv({
    ...argv,
    'testing.password': {
      alias: 'testing:password',
    },
    'testing.username': {
      alias: 'testing:username',
    },
    'log.level': {
      alias: 'log:level',
    },
    'database.password': {
      alias: 'database:password',
    },
    'graphkb.password': {
      alias: 'graphkb:password',
    },
    port: {
      alias: 'web:port',
    },
  })
  .defaults(merge(DEFAULTS, processEnvVariables(process.env)));

if (ENV === 'test') {
  CONFIG.required(['database:password', 'graphkb:password', 'testing:password']);
} else {
  CONFIG.required(['database:password', 'graphkb:password']);
}

module.exports = CONFIG;
