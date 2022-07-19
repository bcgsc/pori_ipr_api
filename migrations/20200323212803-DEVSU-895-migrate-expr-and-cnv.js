const COPY_VARIANTS_TABLE = 'reports_copy_variants';
const EXPRESSION_VARIANTS_TABLE = 'reports_expression_variants';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // rename cnv and outlier tables
      await Promise.all([
        queryInterface.renameTable('reports_copy_number_analysis_cnv', COPY_VARIANTS_TABLE, {transaction}),
        queryInterface.renameTable('reports_expression_outlier', EXPRESSION_VARIANTS_TABLE, {transaction}),
      ]);

      // change column type from integer to float
      await queryInterface.changeColumn(EXPRESSION_VARIANTS_TABLE, 'tcgaPerc', {
        type: Sequelize.FLOAT,
      }, {transaction});

      // copy non-duplicate expression info. from the cnv table
      // into the expression outlier table
      await queryInterface.sequelize.query(
        `
        INSERT INTO ${EXPRESSION_VARIANTS_TABLE} (ident, rpkm, "foldChange", "tcgaPerc", gene_id, report_id, created_at, updated_at, deleted_at) 
          SELECT DISTINCT ON (gene_id) uuid_generate_v4(), "expressionRpkm", "foldChange", "tcgaPerc", gene_id, report_id, created_at, updated_at, deleted_at 
          FROM ${COPY_VARIANTS_TABLE} AS cnv 
          WHERE NOT EXISTS (
            SELECT * FROM ${EXPRESSION_VARIANTS_TABLE} AS exp 
            WHERE exp.gene_id = cnv.gene_id
          ) 
          AND NOT (cnv."expressionRpkm" IS NULL AND cnv."foldChange" IS NULL AND cnv."tcgaPerc" IS NULL)`,
        {transaction},
      );

      // replace all na's with null
      await queryInterface.bulkUpdate(EXPRESSION_VARIANTS_TABLE, {copyChange: null}, {copyChange: 'na'}, {transaction});

      // change column type from text to integer
      await queryInterface.changeColumn(EXPRESSION_VARIANTS_TABLE, 'copyChange', {
        type: 'INTEGER USING CAST("copyChange" as INTEGER)',
      }, {transaction});

      // copy non-duplicate copy number info. from the outlier
      // table into the cnv table
      await queryInterface.sequelize.query(
        `
        INSERT INTO ${COPY_VARIANTS_TABLE} (ident, "ploidyCorrCpChange", "lohState", "cnvState", gene_id, report_id, created_at, updated_at, deleted_at) 
          SELECT DISTINCT ON (gene_id) uuid_generate_v4(), "copyChange", "lohState", "cnvState", gene_id, report_id, created_at, updated_at, deleted_at
          FROM ${EXPRESSION_VARIANTS_TABLE} AS exp 
          WHERE NOT EXISTS (
            SELECT * FROM ${COPY_VARIANTS_TABLE} AS cnv 
            WHERE exp.gene_id = cnv.gene_id
          ) 
          AND NOT (exp."copyChange" IS NULL AND exp."lohState" IS NULL AND exp."cnvState" IS NULL)`,
        {transaction},
      );

      return Promise.all([
        // remove copy variants table columns
        queryInterface.removeColumn(COPY_VARIANTS_TABLE, 'expressionRpkm', {transaction}),
        queryInterface.removeColumn(COPY_VARIANTS_TABLE, 'foldChange', {transaction}),
        queryInterface.removeColumn(COPY_VARIANTS_TABLE, 'tcgaPerc', {transaction}),
        queryInterface.removeColumn(COPY_VARIANTS_TABLE, 'cnvVariant', {transaction}),
        // remove expression variants columns
        queryInterface.removeColumn(EXPRESSION_VARIANTS_TABLE, 'copyChange', {transaction}),
        queryInterface.removeColumn(EXPRESSION_VARIANTS_TABLE, 'lohState', {transaction}),
        queryInterface.removeColumn(EXPRESSION_VARIANTS_TABLE, 'cnvState', {transaction}),
        queryInterface.removeColumn(EXPRESSION_VARIANTS_TABLE, 'outlierType', {transaction}),
        queryInterface.removeColumn(EXPRESSION_VARIANTS_TABLE, 'expType', {transaction}),
      ]);
    });
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
