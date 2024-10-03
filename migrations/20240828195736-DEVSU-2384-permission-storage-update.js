const TABLE = 'notifications';
const {USER_GROUPS} = require('../app/constants');

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        TABLE,
        'user_group_id',
        {transaction},
      );

      await queryInterface.addColumn(
        TABLE,
        'user_group',
        {
          type: Sq.ENUM(USER_GROUPS),
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
