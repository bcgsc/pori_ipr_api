const SIGNATURES_TABLE = 'reports_signatures';
const ANALYST_COMMENTS_TABLE = 'reports_summary_analyst_comments';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1) rename probe_signatures table to reports_signatures
      await queryInterface.renameTable('reports_probe_signature', SIGNATURES_TABLE, {transaction});

      // 2) rename the columns of reports_signatures to be the same as analyst comments
      await Promise.all([
        queryInterface.renameColumn(SIGNATURES_TABLE, 'reviewerSignedBy_id', 'reviewer_id', {transaction}),
        queryInterface.renameColumn(SIGNATURES_TABLE, 'reviewerSignedAt', 'reviewer_signed_at', {transaction}),
        queryInterface.renameColumn(SIGNATURES_TABLE, 'readySignedBy_id', 'author_id', {transaction}),
        queryInterface.renameColumn(SIGNATURES_TABLE, 'readySignedAt', 'author_signed_at', {transaction}),
      ]);

      // 3) transfer signatures from comment analyst to reports_signatures (probe_signatures) table
      await queryInterface.sequelize.query(`
          INSERT INTO ${SIGNATURES_TABLE} (ident, report_id, reviewer_id, reviewer_signed_at, author_id, author_signed_at, created_at, updated_at, deleted_at) (
            SELECT uuid_generate_v4(), report_id, reviewer_id, reviewer_signed_at, author_id, author_signed_at, created_at, updated_at, deleted_at 
            FROM ${ANALYST_COMMENTS_TABLE}
          )
        `, {transaction});

      // 4) remove deleted values from comments, because of signature updates causing issues
      await queryInterface.bulkDelete(ANALYST_COMMENTS_TABLE, {deleted_at: {[Sequelize.Op.ne]: null}}, {transaction});

      // 5) remove columns from analyst comments
      return Promise.all([
        queryInterface.removeColumn(ANALYST_COMMENTS_TABLE, 'reviewer_id', {transaction}),
        queryInterface.removeColumn(ANALYST_COMMENTS_TABLE, 'reviewer_signed_at', {transaction}),
        queryInterface.removeColumn(ANALYST_COMMENTS_TABLE, 'author_id', {transaction}),
        queryInterface.removeColumn(ANALYST_COMMENTS_TABLE, 'author_signed_at', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
