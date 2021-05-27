const db = require('../../models');
const schemaGenerator = require('../../schemas/schemaGenerator');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');
const {GENE_LINKED_VARIANT_MODELS, KB_PIVOT_MAPPING} = require('../../constants');
const reportUpload = require('../../schemas/report/reportUpload')(false);
const germlineReportUploadSchema = require('../../schemas/germlineSmallMutation/upload')(false);


const schemas = {};

const ID_FIELDS = [
  'germlineReportId', 'user_id', 'owner_id', 'createdBy_id', 'addedBy_id', 'variantId',
  'gene1Id', 'gene2Id', 'reviewerId', 'biofxAssignedId', 'logoId', 'headerId', 'templateId',
];
const PUBLIC_VIEW_EXCLUDE = [...ID_FIELDS, 'id', 'reportId', 'geneId', 'deletedAt'];
const GENERAL_EXCLUDE = REPORT_EXCLUDE.concat(ID_FIELDS);
const GENERAL_EXCLUDE_ASSOCIATIONS = ['report', 'reports', 'germlineReport', 'user_project', 'userGroupMember'];

const MODELS_WITH_VARIANTS = ['kbMatches', 'genes'];

const VARIANT_ASSOCIATIONS = {
  oneOf: Object.values(KB_PIVOT_MAPPING).map((value) => {
    return {
      $ref: `#/components/schemas/${value}`,
    };
  }),
};

const TEMPLATE_IMAGES = {
  logo: {
    type: 'string',
    format: 'binary',
    description: 'logo image to upload',
  },
  header: {
    type: 'string',
    format: 'binary',
    description: 'header image to upload',
  },
};

const PATHWAY_IMAGE = {
  pathway: {
    type: 'string',
    format: 'xml',
    description: 'pathway image as svg to upload',
  },
};


/**
 * Check if model has specific excludes or
 * use the default excludes
 *
 * @param {object} model - Sequelize model to get excludes for
 * @returns {Array<Array<string>>} - Returns an array of excludes for return, POST/PUT body and associations
 */
const getExcludes = (model) => {
  let publicExclude = PUBLIC_VIEW_EXCLUDE;
  let exclude = GENERAL_EXCLUDE;
  let excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS;

  switch (model) {
    case 'user':
      publicExclude = [...PUBLIC_VIEW_EXCLUDE, 'password'];
      exclude = [...GENERAL_EXCLUDE, 'password'];
      excludeAssociations = [...GENERAL_EXCLUDE_ASSOCIATIONS, 'metadata'];
      break;
    case 'project':
      excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat(['user', 'users', 'user_projects']);
      break;
    case 'therapeuticTarget':
      exclude = [...GENERAL_EXCLUDE, 'rank'];
      break;
    case 'signatures':
      publicExclude = [...PUBLIC_VIEW_EXCLUDE, 'reviewerId', 'authorId'];
      break;
    case 'analysis_reports_user':
      excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat(['addedBy']);
      break;
    default:
  }

  // Remove all variant associations for polymorphic relation
  if (MODELS_WITH_VARIANTS.includes(model)) {
    excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat(GENE_LINKED_VARIANT_MODELS).concat(['structuralVariants1', 'structuralVariants2']);
  }

  // Remove kbMatches from variant models
  if (GENE_LINKED_VARIANT_MODELS.includes(model)) {
    excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat('kbMatches');
  }

  return [publicExclude, exclude, excludeAssociations];
};

// Remove joining models from the list of models to use for generating schemas
const {
  userGroupMember, reportProject, user_project, ...models
} = db.models;

// Generate schemas from Sequelize models. One for the public returned value, one
// for the body of a POST request, and one for the body of a PUT request
for (const model of Object.keys(models)) {
  // Get excludes for model
  const [publicExclude, exclude, excludeAssociations] = getExcludes(model);

  // generate public view of model (no associations)
  schemas[model] = schemaGenerator(db.models[model], {
    isJsonSchema: false, title: `${model}`, exclude: publicExclude,
  });

  // generate public view of model (with associations)
  schemas[`${model}Associations`] = schemaGenerator(db.models[model], {
    isJsonSchema: false, title: `${model}Associations`, exclude: publicExclude, associations: true, excludeAssociations,
  });

  // generate body of POST request schemas
  schemas[`${model}Create`] = schemaGenerator(db.models[model], {
    isJsonSchema: false, title: `${model}Create`, exclude,
  });

  // generate body of PUT request schemas
  schemas[`${model}Update`] = schemaGenerator(db.models[model], {
    isJsonSchema: false, title: `${model}Update`, exclude, nothingRequired: true,
  });

  // Check if model has a polymorphic variants relationship
  if (MODELS_WITH_VARIANTS.includes(model)) {
    schemas[`${model}Associations`].properties.varaint = VARIANT_ASSOCIATIONS;
  }
}

// **Special Cases**

// *Returned object*

// analysis report
schemas.analysis_reportAssociations = schemaGenerator(db.models.analysis_report, {
  isJsonSchema: false, title: 'analysis_reportAssociations', exclude: [...PUBLIC_VIEW_EXCLUDE, 'config'], associations: true, includeAssociations: ['patientInformation', 'createdBy', 'template', 'users'],
});

// appendices
schemas.appendices = schemaGenerator(db.models.analysis_report, {
  isJsonSchema: false, title: 'appendices', include: ['sampleInfo', 'seqQC', 'config'],
});

// *POST request body*

// analysis report (report upload)

// Loop through generated schema and point to create version
// of association instead of return version of association
Object.keys(reportUpload.properties).forEach((key) => {
  if (reportUpload.properties[key].$ref) {
    reportUpload.properties[key].$ref += 'Create';
  } else if (reportUpload.properties[key].type === 'array' && reportUpload.properties[key].items.$ref) {
    reportUpload.properties[key].items.$ref += 'Create';
  }
});

schemas.analysis_reportCreate = reportUpload;

// germline report upload
schemas.germlineSmallMutationCreate = germlineReportUploadSchema;

// template upload
// add images to properties
Object.assign(schemas.templateCreate.properties, TEMPLATE_IMAGES);

// pathway analysis upload
// add image properties
Object.assign(schemas.pathwayAnalysisCreate.properties, PATHWAY_IMAGE);

// report-user binding create
// add user ident to properties
Object.assign(schemas.analysis_reports_userCreate.properties, {
  user: {
    type: 'string',
    format: 'UUIDv4',
    description: 'ident of user to bind to report',
  },
});


// *PUT request body*

// add template name to report update
schemas.analysis_reportUpdate.properties.template = {
  type: 'string', description: 'Template name',
};

// germline report update (add biofxAssigned user ident)
schemas.germlineSmallMutationUpdate.properties.biofxAssigned = {
  type: 'string', format: 'UUIDv4',
};

// therapeutic targets bulk update
schemas.therapeuticTargetRanksBulkUpdate = schemaGenerator(db.models.therapeuticTarget, {
  isJsonSchema: false,
  title: 'therapeuticTargetRanksBulkUpdate',
  include: ['ident', 'rank'],
  required: ['ident', 'rank'],
});

// template update
// add images to properties
Object.assign(schemas.templateUpdate.properties, TEMPLATE_IMAGES);

// pathway analysis update
// add images to properties
Object.assign(schemas.pathwayAnalysisUpdate.properties, PATHWAY_IMAGE);


module.exports = schemas;
