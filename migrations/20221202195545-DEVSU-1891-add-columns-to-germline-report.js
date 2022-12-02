const GSM_TABLE = 'germline_small_mutations_variant';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        GSM_TABLE,
        'cgl_review_result',
        {type: Sq.ENUM(['pathogenic', 'likely pathogenic', 'VUS', 'likely benign', 'benign']),
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        GSM_TABLE,
        'returned_to_clinician',
        {type: Sq.ENUM(['yes', 'no']),
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        GSM_TABLE,
        'referral_hcp',
        {type: Sq.ENUM(['yes', 'no']),
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        GSM_TABLE,
        'known_to_hcp',
        {type: Sq.ENUM(['yes', 'no']),
          defaultValue: null},
        {transaction},
      );
      await queryInterface.addColumn(
        GSM_TABLE,
        'reason_no_hcp_referral',
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
