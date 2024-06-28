const TABLE = 'users';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'allow_notifications',
        {
          type: Sq.BOOLEAN,
          defaultValue: true,
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
