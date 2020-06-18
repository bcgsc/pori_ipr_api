const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');
const schema = require('../../schemas/report/reportUpload');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schemas = {};

// eslint-disable-next-line guard-for-in
for (const property in db.models) {
  schemas[property] = schemaManager.generate(db.models[property], new OpenApi3Strategy(), {
    title: `${property}`,
    associations: true,
    exclude: [...BASE_EXCLUDE],
  });
}

schemas.newUser = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'newUser',
  associations: false,
  exclude: [...BASE_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

schemas.user = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'user',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

schemas.group = schemaManager.generate(db.models.userGroup, new OpenApi3Strategy(), {
  title: 'group',
  associations: true,
  exclude: [...BASE_EXCLUDE, 'owner_id', 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

schemas.project = schemaManager.generate(db.models.project, new OpenApi3Strategy(), {
  title: 'project',
  associations: true,
  exclude: [...BASE_EXCLUDE],
});

schemas.analysis_report = schemaManager.generate(db.models.analysis_report, new OpenApi3Strategy(), {
  title: 'analysis_report',
  exclude: ['createdBy_id', ...BASE_EXCLUDE],
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments', 'projects'],
});

module.exports = schemas;
