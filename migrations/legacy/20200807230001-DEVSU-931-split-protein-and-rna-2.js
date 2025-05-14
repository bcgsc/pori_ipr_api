const NEW_TABLE = 'reports_protein_variants';
const OLD_TABLE = 'reports_expression_variants';

const {addUniqueActiveFieldIndex} = require('../../migrationTools');

const DROP_COLUMNS = [
  'ptxPerc',
  'ptxkIQR',
  'ptxQC',
  'ptxPercCol',
  'ptxTotSampObs',
  'ptxPogPerc',
];

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, NEW_TABLE, ['ident']);
      // copy the data to the new table
      await queryInterface.sequelize.query(
        `INSERT INTO ${NEW_TABLE}(
          ident,
          created_at,
          updated_at,
          deleted_at,
          report_id,
          gene_id,
          secondary_comparator,
          kiqr,
          percentile,
          comparator,
          secondary_percentile,
          qc,
          total_sample_observed
        )
        SELECT uuid_generate_v4(),
          created_at,
          updated_at,
          deleted_at,
          report_id,
          gene_id,
          'POG',
          "ptxkIQR",
          "ptxPerc",
          "ptxPercCol",
          "ptxPogPerc",
          "ptxQC",
          "ptxTotSampObs"
        FROM ${OLD_TABLE}
        WHERE "ptxkIQR" IS NOT NULL
          OR "ptxPerc" IS NOT NULL
          OR "ptxPogPerc" IS NOT NULL
          OR "ptxTotSampObs" IS NOT NULL`,
        {transaction},
      );
      // delete the columns from the original table
      for (const col of DROP_COLUMNS) {
        await queryInterface.removeColumn(
          OLD_TABLE,
          col,
          {transaction},
        );
      }
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
