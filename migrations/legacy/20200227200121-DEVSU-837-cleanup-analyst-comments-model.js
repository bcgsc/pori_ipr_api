const COMMENTS_TABLE = 'pog_analysis_reports_summary_analyst_comments';

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('Removing unused columns');
      await queryInterface.removeColumn(COMMENTS_TABLE, 'reviewedBy', {transaction});
      await queryInterface.removeColumn(COMMENTS_TABLE, 'reviewedAt', {transaction});

      console.log('Renaming columns');
      await queryInterface.renameColumn(COMMENTS_TABLE, 'reviewerSignedBy_id', 'reviewer_id', {transaction});
      await queryInterface.renameColumn(COMMENTS_TABLE, 'reviewerSignedAt', 'reviewer_signed_at', {transaction});
      await queryInterface.renameColumn(COMMENTS_TABLE, 'authorSignedBy_id', 'author_id', {transaction});
      await queryInterface.renameColumn(COMMENTS_TABLE, 'authorSignedAt', 'author_signed_at', {transaction});

      await transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
