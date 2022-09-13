const KB_MATCHES_TABLE = 'reports_kb_matches';
const THERAPEUTIC_TARGETS_TABLE = 'reports_therapeutic_targets';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        KB_MATCHES_TABLE,
        'ipr_evidence_level',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        THERAPEUTIC_TARGETS_TABLE,
        'ipr_evidence_level',
        {type: Sq.TEXT,
          defaultValue: null},
        {transaction},
      );
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
