const TABLE = 'templates_appendix';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex(
        TABLE,
        ['template_id', 'project_id'],
        {
          where: {
            deleted_at: null,
          },
          name: 'templates_appendix_template_project',
          unique: true,
        },
        {transaction},
      );
      await queryInterface.addIndex(
        TABLE,
        ['template_id'],
        {
          where: {
            deleted_at: null,
            project_id: null,
          },
          name: 'templates_appendix_template_null_project',
          unique: true,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
