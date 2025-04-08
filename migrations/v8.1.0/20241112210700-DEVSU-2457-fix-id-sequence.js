module.exports = {
  up: async (queryInterface) => {
    // eslint-disable-next-line max-len
    queryInterface.sequelize.query('SELECT setval(\'reports_kb_matches_id_seq\', (SELECT MAX(id) FROM reports_kb_matches) + 1);');
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
