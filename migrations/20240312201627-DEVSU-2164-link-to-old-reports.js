const TABLE = 'reports';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'legacy_presentation_filepath',
        {
          type: Sq.STRING,
          defaultValue: null,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'legacy_report_filepath',
        {
          type: Sq.STRING,
          defaultValue: null,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
