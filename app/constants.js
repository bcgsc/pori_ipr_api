const CONFIG = require('./config');

module.exports = {
  UUIDregex: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
  KB_PIVOT_MAPPING: {
    sv: 'structuralVariants',
    cnv: 'copyVariants',
    mut: 'smallMutations',
    exp: 'expressionVariants',
    protein: 'proteinVariants',
    msi: 'msi',
    tmb: 'tmburMutationBurden',
    sigv: 'signatureVariants',
  },
  NOTIFICATION_EVENT: {
    USER_BOUND: 'userBound',
    REPORT_CREATED: 'reportCreated',
  },
  KB_PIVOT_COLUMN: 'variantType',
  GENE_LINKED_VARIANT_MODELS: [
    'expressionVariants',
    'smallMutations',
    'copyVariants',
    'structuralVariants',
    'probeResults',
    'proteinVariants',
  ],
  REPORT_CREATE_BASE_URI: '/reports/create',
  REPORT_UPDATE_BASE_URI: '/reports/update',
  GERMLINE_CREATE_BASE_URI: '/germline/create',
  GERMLINE_UPDATE_BASE_URI: '/germline/update',
  UPLOAD_BASE_URI: '/upload',
  DEFAULT_LOGO_HEIGHT: 64,
  DEFAULT_LOGO_WIDTH: 64,
  DEFAULT_HEADER_HEIGHT: 96,
  DEFAULT_HEADER_WIDTH: 300,
  MASTER_ACCESS: ['admin'],
  MANAGER_ACCESS: ['admin', 'manager'],
  MASTER_REPORT_ACCESS: ['admin', 'manager'],
  ALL_PROJECTS_ACCESS: ['admin', 'all projects access'],
  UPDATE_METHODS: ['POST', 'PUT', 'DELETE'],
  IMAGE_UPLOAD_LIMIT: CONFIG.get('image:image_upload_limit'),
  IMAGE_SIZE_LIMIT: 1500000, // in bytes
};
