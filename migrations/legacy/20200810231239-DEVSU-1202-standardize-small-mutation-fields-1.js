const TABLE = 'reports_small_mutations';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // create the new column
      return Promise.all([
        ...[
          'tumour_alt_count',
          'tumour_ref_count',
          'tumour_depth',
          'normal_alt_count',
          'normal_ref_count',
          'normal_depth',
          'rna_alt_count',
          'rna_ref_count',
          'rna_depth',
          'start_position',
          'end_position',
        ].map(async (col) => {
          return queryInterface.addColumn(TABLE, col, {
            type: Sq.INTEGER, defaultValue: null,
          }, {transaction});
        }),
        ...[
          'ncbi_build',
          'chromosome',
          'ref_seq',
          'alt_seq',
        ].map(async (col) => {
          return queryInterface.addColumn(TABLE, col, {
            type: Sq.TEXT, defaultValue: null,
          }, {transaction});
        }),
      ]);
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
