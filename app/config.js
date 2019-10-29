const nconf = require('nconf');
const {merge} = require('lodash');

// set the default db name based on the node-env
let DEFAULT_DB_NAME = 'ipr-dev';
if (process.env.NODE_ENV === 'production') {
  DEFAULT_DB_NAME = 'ipr';
} else if (process.env.NODE_ENV === 'staging') {
  DEFAULT_DB_NAME = 'ipr-sync-staging';
}

let DEFAULT_LOG_LEVEL = 'debug';
if (process.env.NODE_ENV === 'production') {
  DEFAULT_LOG_LEVEL = 'info';
} else if (process.env.NODE_ENV === 'test') {
  DEFAULT_LOG_LEVEL = 'warn';
}


const DEFAULT_TEST_USER = 'ipr-test';
const BIOAPPS_DEFAULTS = {
  hostname: 'http://sbs.bcgsc.ca:8100',
  api: '',
};

const LIMS_DEFAULTS = {
  hostname: 'https://lims13.bcgsc.ca',
  api: '/prod/limsapi',
};

const DEFAULTS = {
  env: process.env.NODE_ENV || 'development',
  web: {
    port: 8080,
    ssl: '/etc/ssl/certs/current/combinedcert.cert',
  },
  keycloak: {
    uri: ['production', 'development', 'staging'].includes(process.env.NODE_ENV)
      ? 'https://sso.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token'
      : 'http://ga4ghdev01.bcgsc.ca:8080/auth/realms/CanDIG/protocol/openid-connect/token',
    clientId: 'IPR',
    role: 'IPR',
    keyFile: ['production', 'development', 'staging'].includes(process.env.NODE_ENV)
      ? 'keys/prodkey.pem'
      : 'keys/devkey.pem',
  },
  testing: {
    username: DEFAULT_TEST_USER,
  },
  log: {
    level: DEFAULT_LOG_LEVEL,
  },
  database: {
    engine: 'postgres',
    migrate: false,
    hardMigration: false,
    schema: 'public',
    prefix: '',
    username: 'ipr_service',
    hostname: 'seqdevdb01.bcgsc.ca',
    port: 5432,
    name: DEFAULT_DB_NAME,
  },
  jira: {
    hostname: 'www.bcgsc.ca',
    api: '/jira/rest',
    version: '2',
  },
  lims: LIMS_DEFAULTS,
  bioapps: BIOAPPS_DEFAULTS,
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
  loader: {
    defaults: {
      default_genomic: {
        libraries: [
          'meta',
          'image',
          'summary_patientInformation',
          'summary_tumourAnalysis',
          'summary_variantCounts',
          'summary_mutationSummary',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'summary_probeTarget',
          'detailed_alterations',
          'detailed_approvedThisCancer',
          'detailed_approvedOtherCancer',
          'detailed_targetedGenes',
          'somatic_smallMutations',
          'somatic_mutationSignature',
          'copynumber_cnv',
          'structural_sv',
          'expression_outlier',
          'expression_drugTarget',
        ],
      },
      pog_genomic: {
        libraries: [
          'meta',
          'image',
          'summary_patientInformation',
          'summary_tumourAnalysis',
          'summary_variantCounts',
          'summary_mutationSummary',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'summary_probeTarget',
          'detailed_alterations',
          'detailed_approvedThisCancer',
          'detailed_approvedOtherCancer',
          'detailed_targetedGenes',
          'somatic_smallMutations',
          'somatic_mutationSignature',
          'copynumber_cnv',
          'structural_sv',
          'expression_outlier',
          'expression_drugTarget',
        ],
      },
      GPH_Lymphoma_genomic: {
        libraries: [
          'A*_A*',
        ],
        moduleOptions: {
          somatic_mutationSignature: {
            project: 'gph_lymphoma',
          },
        },
        loaders: [
          'meta',
          'image',
          'summary_patientInformation',
          'summary_tumourAnalysis',
          'summary_variantCounts',
          'summary_mutationSummary',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'summary_probeTarget',
          'detailed_alterations',
          'detailed_approvedThisCancer',
          'detailed_approvedOtherCancer',
          'detailed_targetedGenes',
          'somatic_smallMutations',
          'somatic_mutationSignature',
          'copynumber_cnv',
          'structural_sv',
          'expression_outlier',
          'expression_drugTarget',
        ],
      },
      default_genomic_no_flat: {
        libraries: [
          'meta',
          'image',
          'summary_variantCounts',
          'summary_mutationSummary',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'summary_probeTarget',
          'detailed_alterations',
          'detailed_approvedThisCancer',
          'detailed_approvedOtherCancer',
          'detailed_targetedGenes',
          'somatic_smallMutations',
          'somatic_mutationSignature',
          'copynuyargsmber_cnv',
          'structyargsural_sv',
          'expresyargssion_outlier',
          'expresyargssion_drugTarget',
        ],
      },
      default_probe: {
        loaders: [
          'summary_patientInformation',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'alterations_identified',
          'alterations',
          'sample_information',
          'test_information',
          'approved_thisCancer',
          'approved_otherCancer',
        ],
      },
      PROFYLE_probe: {
        loaders: [
          'summary_patientInformation',
          'summary_genomicEventsTherapeutic',
          'summary_genomicAlterationsIdentified',
          'alterations_identified',
          'alterations',
          'sample_information',
          'test_information',
          'approved_thisCancer',
          'approved_otherCancer',
        ],
      },
      pog_probe: {
        loaders: [
          'summary_patientInformation',
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'alterations_identified',
          'alterations',
          'sample_information',
          'test_information',
          'approved_thisCancer',
          'approved_otherCancer',
        ],
      },
      default_probe_no_flat: {
        loaders: [
          'summary_genomicAlterationsIdentified',
          'summary_genomicEventsTherapeutic',
          'alterations_identified',
          'alterations',
          'sample_information',
          'test_information',
          'approved_thisCancer',
          'approved_otherCancer',
        ],
      },
    },
  },
};

const processEnvVariables = (env = process.env, opt = {}) => {
  const {lowerCase = true, separator = '_'} = opt;
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
  argv[`database.${key}`] = {alias: `database:${key}`, default: value, parseValues: true};
});
Object.entries(DEFAULTS.keycloak, ([key, value]) => {
  argv[`keycloak.${key}`] = {alias: `keycloak:${key}`, default: value, parseValues: true};
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
    port: {
      alias: 'web:port',
    },
    'bioapps.hostname': {
      alias: 'bioapps:hostname',
    },
    'bioapps.api': {
      alias: 'bioapps:api',
    },
    'lims.hostname': {
      alias: 'lims:hostname',
    },
    'lims.api': {
      alias: 'lims:api',
    },
  })
  .defaults(merge(DEFAULTS, processEnvVariables(process.env)));

if (process.env.NODE_ENV === 'test') {
  CONFIG.required(['database:password', 'testing:password']);
} else {
  CONFIG.required(['database:password']);
}

module.exports = CONFIG;
