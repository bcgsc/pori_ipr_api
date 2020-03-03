const {JsonSchemaManager, OpenApi3Strategy} = require('@alt3/sequelize-to-json-schemas');
const db = require('../../models');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const schemaManager = new JsonSchemaManager({secureSchemaUri: false});

const user = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'user',
  associations: false,
  exclude: [],
});

const newUser = schemaManager.generate(db.models.user, new OpenApi3Strategy(), {
  title: 'newUser',
  associations: false,
  exclude: [],
});

module.exports = {
  user,
  newUser,
};
