const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

// TODO: Fix user schemas after https://www.bcgsc.ca/jira/browse/DEVSU-908
const user = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'user',
  associations: false,
  exclude: [],
});

const newUser = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'newUser',
  associations: false,
  exclude: [...BASE_EXCLUDE, 'jiraToken', 'jiraXsrf', 'lastLogin', 'settings'],
});

const group = schemaManager.generate(db.models.userGroup, new OpenApi3Strategy(), {
  title: 'group',
  associations: false,
  exclude: [...BASE_EXCLUDE],
});

module.exports = {
  user,
  newUser,
  group,
};
