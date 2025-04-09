const TABLE = 'reports';

module.exports = {
  async up(queryInterface, Sq) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'upload_contents',
        {
          type: Sq.JSONB,
        },
        {transaction},
      );
    });
  },

  async down() {
    throw new Error('Not Implemented!');
  },
};
