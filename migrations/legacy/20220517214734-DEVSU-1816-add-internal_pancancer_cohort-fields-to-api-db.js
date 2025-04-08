const EXPRESSION_VARIANT_TABLE = 'reports_expression_variants';
const PATIENT_INFORMATION_TABLE = 'reports_patient_information';

module.exports = {
  up: async (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        queryInterface.addColumn(EXPRESSION_VARIANT_TABLE, 'internal_pancancer_percentile', Sq.FLOAT, {transaction}),
        queryInterface.addColumn(EXPRESSION_VARIANT_TABLE, 'internal_pancancer_kiqr', Sq.FLOAT, {transaction}),
        queryInterface.addColumn(EXPRESSION_VARIANT_TABLE, 'internal_pancancer_qc', Sq.FLOAT, {transaction}),
        queryInterface.addColumn(EXPRESSION_VARIANT_TABLE, 'internal_pancancer_fold_change', Sq.FLOAT, {transaction}),
        queryInterface.addColumn(EXPRESSION_VARIANT_TABLE, 'internal_pancancer_zscore', Sq.FLOAT, {transaction}),

        queryInterface.addColumn(PATIENT_INFORMATION_TABLE, 'internal_pancancer_cohort', Sq.TEXT, {transaction}),
      ]);
    });
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
