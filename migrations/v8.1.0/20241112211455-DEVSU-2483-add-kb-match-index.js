module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex('reports_kb_match_join', ['kb_match_id'], {
      name: 'idx_kb_match_id_join',
    });
    await queryInterface.addIndex('reports_kb_match_join', ['kb_matched_statement_id'], {
      name: 'idx_kb_matched_statement_id_join',
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
