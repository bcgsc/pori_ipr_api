const GERMLINE = 'germline_small_mutations';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        GERMLINE,
        'state',
        {
          type: Sq.ENUM('ready', 'active', 'uploaded', 'signedoff', 'archived', 'reviewed', 'nonproduction'),
          defaultValue: 'uploaded',
        },
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
