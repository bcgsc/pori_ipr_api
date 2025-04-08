const TABLE = 'reports_expression_variants';
const RENAMES = {
  rnaReads: 'rna_reads',
  foldChange: 'primary_site_fold_change',
  tcgaPerc: 'disease_percentile',
  tcgakIQR: 'disease_kiqr',
  tcgaQC: 'disease_qc',
};

const NEW_FLOAT_COLUMNS = [
  'biopsy_site_fold_change',
  'biopsy_site_kiqr',
  'biopsy_site_percentile',
  'biopsy_site_qc',
  'biopsy_site_zscore',
  'disease_fold_change',
  'disease_zscore',
  'primary_site_kiqr',
  'primary_site_percentile',
  'primary_site_qc',
  'primary_site_zscore',
  'tpm',
];

const DROP_COLUMNS = [
  'gtexAvgPerc',
  'gtexAvgFC',
  'gtexAvgkIQR',
  'tcgaAvgPerc',
  'tcgaAvgkIQR',
  'tcgaAvgQC',
  'tcgaNormPerc',
  'tcgaNormkIQR',
  'gtexkIQR',
  'gtexPerc',
  'gtexFC',
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
