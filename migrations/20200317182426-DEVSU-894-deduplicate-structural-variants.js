const {v4: uuidv4} = require('uuid');

const SV_TABLE = 'reports_structural_variation_sv';
const EXPRESSION_TABLE = 'reports_expression_outlier';

module.exports = {
  up: async (queryInterface) => {
    // copy expression data to the individual table
    const transaction = await queryInterface.sequelize.transaction();

    const nullValues = '(\'na\', \'\', \'nan\')';
    try {
      const records = await queryInterface.sequelize.query(
        `SELECT DISTINCT ON (report_id, gene_id) * FROM (
          SELECT report_id, gene1_id AS gene_id,
            CASE
              WHEN split_part(rpkm, '/', 1) IN ${nullValues} THEN NULL
              ELSE split_part(rpkm, '/', 1)::DOUBLE PRECISION
            END AS rpkm,
            CASE
              WHEN split_part("tcgaPerc", '/', 1) IN ${nullValues} THEN NULL
              ELSE split_part("tcgaPerc", '/', 1)::INTEGER
            END AS "tcgaPerc",
            CASE
              WHEN split_part("foldChange", '/', 1) IN ${nullValues} THEN NULL
              ELSE split_part("foldChange", '/', 1)::DOUBLE PRECISION
            END AS "foldChange",
            created_at,
            updated_at,
            deleted_at
          FROM ${SV_TABLE}
          UNION
          SELECT report_id, gene1_id AS gene_id,
            CASE
              WHEN split_part(rpkm, '/', 2) IN ${nullValues} THEN NULL
              ELSE split_part(rpkm, '/', 2)::DOUBLE PRECISION
            END AS rpkm,
            CASE
              WHEN split_part("tcgaPerc", '/', 2) IN ${nullValues} THEN NULL
              ELSE split_part("tcgaPerc", '/', 2)::INTEGER
            END AS "tcgaPerc",
            CASE
              WHEN split_part("foldChange", '/', 2) IN ${nullValues} THEN NULL
              ELSE split_part("foldChange", '/', 2)::DOUBLE PRECISION
            END AS "foldChange",
            created_at,
            updated_at,
            deleted_at
          FROM ${SV_TABLE}
        ) foo
        WHERE (
          foo.rpkm IS NOT NULL
          OR foo."tcgaPerc" IS NOT NULL
          OR foo."foldChange" IS NOT NULL
        ) AND NOT EXISTS (
          SELECT * FROM ${EXPRESSION_TABLE} exp WHERE foo.gene_id = exp.gene_id
        ) AND foo.gene_id IS NOT NULL
        ORDER BY foo.report_id,
          foo.gene_id,
          foo.deleted_at DESC,
          foo."tcgaPerc" DESC,
          foo.rpkm DESC,
          foo."foldChange" DESC;
        `,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (records.length) {
        console.log(`copying ${records.length} records from ${SV_TABLE} to ${EXPRESSION_TABLE}`);
        await queryInterface.bulkInsert(
          EXPRESSION_TABLE,
          records.map((r) => {
            return {...r, ident: uuidv4()};
          }),
          {transaction},
        );
      }

      // drop the expression columns from the SV table
      console.log('remove expression-related columns from the SV table');
      await Promise.all(['tcgaPerc', 'rpkm', 'foldChange'].map((col) => {
        return queryInterface.removeColumn(SV_TABLE, col, {transaction});
      }));

      console.log('rename the sv table to reports_structural_variants');
      await queryInterface.renameTable(SV_TABLE, 'reports_structural_variants', {transaction});
      await transaction.commit();
    } catch (e) {
      console.error(e);
      await transaction.rollback();
      throw e;
    }
  },

  down: () => {
    throw new Error('not implemented');
  },
};
