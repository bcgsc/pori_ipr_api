module.exports = {
  up: async (queryInterface) => {
    // By deleting the group the cascade effect will automatically remove all the groups in userGroups
    await queryInterface.bulkDelete('userGroups', {id: 2});
    await queryInterface.removeColumn('users', 'access');
    return true;
  },

  down: () => {
    throw new Error('The downgrade is not implemented as it is inherently a lossy transformation');
  },
};
