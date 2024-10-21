const TABLE = 'reports_mutation_burden';

module.exports = {
  async up(queryInterface, Sq) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'sv_burden_hidden',
        {
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        {transaction},
      );
    });
  },

  async down() {
    throw new Error('Not Implemented!');
  },
};
