const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schemas = {};

const SWAGGER_EXCLUDE = ['id', 'reportId', 'geneId', 'deletedAt'];

const {
  germlineReportsToProjects, userGroupMember, reportProject, user_project, ...models
} = db.models;

for (const property of Object.keys(models)) {
  schemas[property] = schemaManager.generate(db.models[property], new OpenApi3Strategy(), {
    title: `${property}`,
    associations: false,
    exclude: [...SWAGGER_EXCLUDE],
  });
}

schemas.newUser = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'newUser',
  associations: false,
  exclude: [...SWAGGER_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

schemas.user = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'user',
  associations: false,
  exclude: [...SWAGGER_EXCLUDE, 'user_projects', 'userGroupMembers'],
});

schemas.group = schemaManager.generate(db.models.userGroup, new OpenApi3Strategy(), {
  title: 'group',
  associations: true,
  exclude: [...SWAGGER_EXCLUDE, 'owner_id', 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

schemas.project = schemaManager.generate(db.models.project, new OpenApi3Strategy(), {
  title: 'project',
  associations: false,
  exclude: [...SWAGGER_EXCLUDE],
});

schemas.analysis_report = schemaManager.generate(db.models.analysis_report, new OpenApi3Strategy(), {
  title: 'analysis_report',
  exclude: ['createdBy_id', ...SWAGGER_EXCLUDE],
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments', 'projects'],
});

schemas.germline_small_mutation = schemaManager.generate(db.models.germline_small_mutation, new OpenApi3Strategy(), {
  title: 'germline_small_mutation',
  associations: false,
  exclude: [...SWAGGER_EXCLUDE],
});

schemas.project.properties.users = schemas.user;
schemas.project.properties.reports = schemas.analysis_report;

schemas.group.properties.users = schemas.user;

schemas.userGroup.properties.users = schemas.user;

module.exports = schemas;
