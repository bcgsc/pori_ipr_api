const REPORT_SIGNATURES_TABLE = 'reports_signatures';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove old constraints
      await Promise.all([
        queryInterface.removeConstraint(REPORT_SIGNATURES_TABLE, 'pog_analysis_reports_probe_signature_readySignedBy_id_fkey', {transaction}),
        queryInterface.removeConstraint(REPORT_SIGNATURES_TABLE, 'pog_analysis_reports_probe_signature_reviewerSignedBy_id_fkey', {transaction}),
      ]);

      // Add new constraints
      return Promise.all([
        queryInterface.addConstraint(REPORT_SIGNATURES_TABLE, {
          fields: ['reviewer_id'],
          type: 'foreign key',
          name: 'reports_signatures_reviewer_id_fkey',
          references: {
            table: 'users',
            field: 'id',
          },
          onDelete: 'restrict',
          onUpdate: 'cascade',
          transaction,
        }),
        queryInterface.addConstraint(REPORT_SIGNATURES_TABLE, {
          fields: ['author_id'],
          type: 'foreign key',
          name: 'reports_signatures_author_id_fkey',
          references: {
            table: 'users',
            field: 'id',
          },
          onDelete: 'restrict',
          onUpdate: 'cascade',
          transaction,
        }),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
