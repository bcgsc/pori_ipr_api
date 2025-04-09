module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.bulkDelete('user_groups', {name: {[Sq.Op.iLike]: 'Full Project Access'}});
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
