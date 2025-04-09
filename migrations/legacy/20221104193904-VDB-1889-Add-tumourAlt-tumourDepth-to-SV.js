const SV_TABLE = 'reports_structural_variants';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        SV_TABLE,
        'tumour_alt_count',
        {type: Sq.INTEGER,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        SV_TABLE,
        'tumour_depth',
        {type: Sq.INTEGER,
          defaultValue: null},
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
