const TABLE = 'user_metadata';
const REMOVE_TABLE = 'users';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        TABLE,
        'last_login_at',
        {
          type: Sq.DATE,
        },
        {transaction},
      );
      await queryInterface.removeColumn(
        REMOVE_TABLE,
        'last_login_at',
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
