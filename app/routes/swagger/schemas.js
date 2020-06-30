const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const schemas = {};

for (const property of Object.keys(db.models)) {
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
  exclude: [...BASE_EXCLUDE, 'user_projects', 'userGroupMembers'],
});

schemas.group = schemaManager.generate(db.models.userGroup, new OpenApi3Strategy(), {
  title: 'group',
  associations: true,
  exclude: [...BASE_EXCLUDE, 'owner_id', 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

schemas.project = schemaManager.generate(db.models.project, new OpenApi3Strategy(), {
  title: 'project',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

schemas.analysis_report = schemaManager.generate(db.models.analysis_report, new OpenApi3Strategy(), {
  title: 'analysis_report',
  exclude: ['createdBy_id', ...BASE_EXCLUDE],
  associations: true,
  excludeAssociations: ['ReportUserFilter', 'createdBy', 'probe_signature', 'presentation_discussion', 'presentation_slides', 'users', 'analystComments', 'projects'],
});

schemas.germline_small_mutation = schemaManager.generate(db.models.germline_small_mutation, new OpenApi3Strategy(), {
  title: 'germline_small_mutation',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

schemas.project.properties.users = schemas.user;
schemas.project.properties.reports = schemas.analysis_report;

schemas.group.properties.users = schemas.user;

schemas.userGroup.properties.users = schemas.user;

delete schemas.user_project;
delete schemas.reportProject;
delete schemas.userGroupMember;
delete schemas.germlineReportsToProjects;

module.exports = schemas;
