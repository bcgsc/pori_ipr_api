const TABLE = 'reports_image_data';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'category',
        {
          type: Sq.STRING,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
