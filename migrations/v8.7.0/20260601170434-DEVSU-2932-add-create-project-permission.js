const {v4: uuidv4} = require('uuid');

const createProjectGroup = 'create project access';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      // eslint-disable-next-line no-multi-str
      `INSERT INTO user_groups (name, created_at, updated_at, ident)\
          VALUES('${createProjectGroup}',\
          '${new Date().toLocaleString()}',\
          '${new Date().toLocaleString()}',\
          '${uuidv4()}');`,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE FROM user_groups WHERE name = '${createProjectGroup}'
    `);
  },
};
