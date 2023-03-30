const REP_PROJ = 'report_projects';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        REP_PROJ,
        'additional_project',
        {
          type: Sq.BOOLEAN,
          unique: false,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
