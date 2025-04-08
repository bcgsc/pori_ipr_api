const TABLE = 'reports_copy_variants';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      return Promise.all([
        // add new columns
        queryInterface.addColumn(TABLE, 'log2_cna', Sequelize.NUMERIC, {transaction}),
        queryInterface.addColumn(TABLE, 'cna', Sequelize.NUMERIC, {transaction}),

        // use more standard name for main copy change column
        queryInterface.renameColumn(TABLE, 'ploidyCorrCpChange', 'copy_change', {transaction}),

        // convert remaining camel case db columns to snake case
        queryInterface.renameColumn(TABLE, 'lohState', 'loh_state', {transaction}),
        queryInterface.renameColumn(TABLE, 'cnvState', 'cnv_state', {transaction}),
        queryInterface.renameColumn(TABLE, 'chromosomeBand', 'chromosome_band', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
