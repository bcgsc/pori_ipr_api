module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
    // Deletes superUser group and its references in userGroupMembers (cascade effect)
      await queryInterface.bulkDelete('userGroups', {id: 2, name: 'superUser'}, {transaction});
      await queryInterface.removeColumn('users', 'access', {transaction});
      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
    }
  },

  down: () => {
    throw new Error('Not implemented');
  },
};
