const USERS_TABLE = 'users';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.changeColumn(USERS_TABLE, 'firstName', {type: Sq.STRING, allowNull: false}, {transaction}),
        queryInterface.changeColumn(USERS_TABLE, 'lastName', {type: Sq.STRING, allowNull: false}, {transaction}),
        queryInterface.changeColumn(USERS_TABLE, 'email', {type: Sq.STRING, allowNull: false}, {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
