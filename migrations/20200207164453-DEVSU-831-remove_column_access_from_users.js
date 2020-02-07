module.exports = {
  up: async (queryInterface) => {
    // Deletes superUser group and its references in userGroupMembers (cascade effect)
    await queryInterface.bulkDelete('userGroups', {id: 2});
    await queryInterface.removeColumn('users', 'access');
    return true;
  },

  down: () => {
    throw new Error('The downgrade is not implemented as it is inherently a lossy transformation');
  },
};
