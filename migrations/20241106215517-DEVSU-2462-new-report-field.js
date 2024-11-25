const TABLE = 'reports';

module.exports = {
  async up(queryInterface, Sq) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'intersect_tmb_score',
        {
          type: Sq.FLOAT,
        },
        {transaction},
      );
    });
  },

  async down() {
    throw new Error('Not Implemented!');
  },
};
