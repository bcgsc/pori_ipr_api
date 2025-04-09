const PROJECTS_TABLE = 'projects';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        PROJECTS_TABLE,
        'description',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
