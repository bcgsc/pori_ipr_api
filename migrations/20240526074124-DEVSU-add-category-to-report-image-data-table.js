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
      await queryInterface.addColumn(
        TABLE,
        'height',
        {
          type: Sq.INTEGER,
        },
        {transaction},
      );
      await queryInterface.addColumn(
        TABLE,
        'width',
        {
          type: Sq.INTEGER,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
