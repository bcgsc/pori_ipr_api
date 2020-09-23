const db = require('../../models');
const schemaGenerator = require('../../schemas/schemaGenerator');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');
const {GENE_LINKED_VARIANT_MODELS} = require('../../constants');


const schemas = {};

const ID_FIELDS = ['germline_report_id', 'user_id', 'owner_id', 'createdBy_id', 'addedBy_id'];
const PUBLIC_VIEW_EXCLUDE = [...ID_FIELDS, 'id', 'reportId', 'geneId', 'deletedAt'];
const GENERAL_EXCLUDE = REPORT_EXCLUDE.concat(ID_FIELDS);
const GENERAL_EXCLUDE_ASSOCIATIONS = ['report', 'reports', 'germline_report', 'user_project', 'userGroupMember'];


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
      publicExclude = [...PUBLIC_VIEW_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'];
      exclude = [...GENERAL_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'];
      break;
    case 'project':
      excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat(['user', 'users', 'user_projects']);
      break;
    case 'genes':
      excludeAssociations = GENERAL_EXCLUDE_ASSOCIATIONS.concat(GENE_LINKED_VARIANT_MODELS).concat(['structuralVariants1', 'structuralVariants2']);
      break;
    default:
      // code block
  }

  return [publicExclude, exclude, excludeAssociations];
};

// Remove joining models from the list of models to use for generating schemas
const {
  germlineReportsToProjects, userGroupMember, reportProject, user_project, ...models
} = db.models;

// Generate schemas from Sequelize models. One for the public returned value, one
// for the body of a POST request, and one for the body of a PUT request
for (const model of Object.keys(models)) {
  // Get excludes for model
  const [publicExclude, exclude, excludeAssociations] = getExcludes(model);

  // generate user returned public schema's
  schemas[model] = schemaGenerator(db.models[model], {
    jsonSchema: false, title: `${model}`, exclude: publicExclude, associations: true, excludeAssociations,
  });

  // generate body of POST request schema's
  schemas[`${model}Create`] = schemaGenerator(db.models[model], {
    jsonSchema: false, title: `${model}Create`, exclude,
  });

  // generate body of PUT request schema's
  schemas[`${model}Update`] = schemaGenerator(db.models[model], {
    jsonSchema: false, title: `${model}Update`, exclude, nothingRequired: true,
  });
}

// **Special Cases**

// *Returned object*

// analysis report
schemas.analysis_report = schemaGenerator(db.models.analysis_report, {
  jsonSchema: false, title: 'analysis_report', exclude: [...PUBLIC_VIEW_EXCLUDE, 'config'], associations: true, includeAssociations: ['patientInformation', 'createdBy', 'users'],
});

// *POST request body*


// *PUT request body*

// therapeutic targets bulk update
schemas.therapeuticTargetRanksBulkUpdate = schemaGenerator(db.models.therapeuticTarget, {
  jsonSchema: false, title: 'therapeuticTargetRanksBulkUpdate',
  include: ['ident', 'rank'], required: ['ident', 'rank'],
});


module.exports = schemas;
