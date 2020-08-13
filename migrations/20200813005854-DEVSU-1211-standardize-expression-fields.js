const TABLE = 'reports_expression_variants';
const RENAMES = {
  rnaReads: 'rna_reads',
  foldChange: 'primary_site_fold_change', // ??????
  tcgaPerc: 'disease_percentile',
  tcgakIQR: 'disease_kiqr',
  tcgaQC: 'disease_qc',
  tcgaNormPerc: 'primary_site_percentile',
  tcgaNormkIQR: 'primary_site_kiqr',
  gtexkIQR: 'biopsy_site_kiqr',
  gtexPerc: 'biopsy_site_percentile',
  gtexFC: 'biopsy_site_fold_change',
};

const NEW_FLOAT_COLUMNS = [
  'disease_zscore',
  'primary_site_zscore',
  'biopsy_site_zscore',
  'tpm',
  'disease_fold_change',
  'primary_site_qc',
  'biopsy_site_qc',
];

const DROP_COLUMNS = [
  'gtexAvgPerc',
  'gtexAvgFC',
  'gtexAvgkIQR',
  'tcgaAvgPerc',
  'tcgaAvgkIQR',
  'tcgaAvgQC',
];

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await Promise.all(Object.entries(RENAMES).map(async ([oldName, newName]) => {
        return queryInterface.renameColumn(TABLE, oldName, newName, {transaction});
      }));

      await Promise.all(NEW_FLOAT_COLUMNS.map(async (col) => {
        return queryInterface.addColumn(TABLE, col, {type: Sq.FLOAT}, {transaction});
      }));

      await Promise.all(DROP_COLUMNS.map(async (col) => {
        return queryInterface.removeColumn(TABLE, col, {transaction});
      }));
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
