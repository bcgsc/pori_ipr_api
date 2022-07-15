const TEMPLATE_APPENDIX_TABLE = 'templates_appendix';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(TEMPLATE_APPENDIX_TABLE, 'project_id', Sq.INTEGER, {transaction}),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
