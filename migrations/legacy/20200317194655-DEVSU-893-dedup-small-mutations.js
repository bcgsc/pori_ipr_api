const {v4: uuidv4} = require('uuid');

const EXPRESSION_TABLE = 'reports_expression_outlier';
const MUT_TABLE = 'reports_somatic_mutations_small_mutations';
const CNV_TABLE = 'reports_copy_number_analysis_cnv';

module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // copy expression variants: expressionRpkm, foldChange, TCGAPerc
      const expRecords = await queryInterface.sequelize.query(
        `SELECT DISTINCT ON (report_id, gene_id) * FROM (
          SELECT report_id,
            gene_id,
            CASE
              WHEN "expressionRpkm"::TEXT IN ('na', '', 'nan', 'NaN') THEN NULL
              ELSE "expressionRpkm"
            END AS rpkm,
            CASE
              WHEN "foldChange"::TEXT in ('na', '', 'nan', 'NaN') THEN NULL
              ELSE "foldChange"
            END AS "foldChange",
            CASE
              WHEN "TCGAPerc"::TEXT IN ('na', '', 'nan', 'NaN') THEN NULL
              ELSE "TCGAPerc"
            END AS "tcgaPerc",
            created_at,
            updated_at,
            deleted_at
          FROM reports_somatic_mutations_small_mutations
        ) mut
        WHERE (
          rpkm IS NOT NULL
          OR "tcgaPerc" IS NOT NULL
          OR "foldChange" IS NOT NULL
        ) AND NOT EXISTS (
          SELECT * FROM reports_expression_outlier exp
          WHERE exp.gene_id = mut.gene_id
        )
        ORDER BY report_id, gene_id, deleted_at DESC;
        `,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (expRecords.length) {
        console.log(`copying ${expRecords.length} records from ${MUT_TABLE} to ${EXPRESSION_TABLE}`);
        await queryInterface.bulkInsert(
          EXPRESSION_TABLE,
          expRecords.map((r) => {
            return {...r, ident: uuidv4()};
          }),
          {transaction},
        );
      }

      // copy copy number variants: ploidyCorrCpChange
      const cnvRecords = await queryInterface.sequelize.query(
        `SELECT DISTINCT ON (report_id, gene_id) report_id,
          gene_id,
          REPLACE("ploidyCorrCpChange", '_int', '') as "ploidyCorrCpChange",
          CASE
            WHEN "lohState"::TEXT NOT IN ('na', '', 'nan', 'NaN') THEN NULL
            ELSE "lohState"
          END as "lohState",
          created_at,
          updated_at,
          deleted_at
        FROM reports_somatic_mutations_small_mutations mut
        WHERE (
          "ploidyCorrCpChange"::TEXT NOT IN ('na', '', 'nan', 'NaN')
          OR "lohState"::TEXT NOT IN ('na', '', 'nan', 'NaN')
        ) AND NOT EXISTS (
            SELECT * FROM reports_copy_number_analysis_cnv cnv
            WHERE cnv.gene_id = mut.gene_id
          )
        ORDER BY report_id, gene_id, deleted_at DESC;
        `,
        {
          transaction,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (cnvRecords.length) {
        console.log(`copying ${cnvRecords.length} records from ${MUT_TABLE} to ${CNV_TABLE}`);
        await queryInterface.bulkInsert(
          CNV_TABLE,
          cnvRecords.map((r) => {
            return {...r, ident: uuidv4()};
          }),
          {transaction},
        );
      }
      // remove expression columns
      console.log('remove the expression-related columns from the small mutations table');
      await Promise.all(['expressionRpkm', 'TCGAPerc', 'foldChange'].map((col) => {
        return queryInterface.removeColumn(MUT_TABLE, col, {transaction});
      }));
      // remove copy variant columns
      console.log('remove the copy-variant-related columns from the small mutations table');
      await Promise.all(['ploidyCorrCpChange', 'lohState'].map((col) => {
        return queryInterface.removeColumn(MUT_TABLE, col, {transaction});
      }));

      // camel-case columns
      const renames = {
        RNAReads: 'rna_reads',
        proteinChange: 'protein_change',
        refAlt: 'ref_alt',
        mutationType: 'mutation_type',
        tumourReads: 'tumour_reads',
      };
      console.log('rename non-camel case columns on the small mutations table');
      await Promise.all(Object.entries(renames).map(async ([oldName, newName]) => {
        return queryInterface.renameColumn(MUT_TABLE, oldName, newName, {transaction});
      }));
      // rename table
      await queryInterface.renameTable(MUT_TABLE, 'reports_small_mutations', {transaction});
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
