module.exports = {
  up: (queryInterface) => {
    return queryInterface.removeColumn('users', 'access');
  },

  down: () => {
    throw new Error('The downgrade is not implemented as it is inherently a lossy transformation');
  },
};
