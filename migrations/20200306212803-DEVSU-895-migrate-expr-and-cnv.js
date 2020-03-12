const COPY_VARIANTS_TABLE = 'reports_copy_variants';
const EXPRESSION_VARIANTS_TABLE = 'reports_expression_variants';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.transaction(async (transaction) => {
        // rename cnv and outlier tables
        await Promise.all([
          queryInterface.renameTable('reports_copy_number_analysis_cnv', COPY_VARIANTS_TABLE, {transaction}),
          queryInterface.renameTable('reports_expression_outlier', EXPRESSION_VARIANTS_TABLE, {transaction}),
        ]);

        // change column type from text to integer
        await queryInterface.changeColumn(EXPRESSION_VARIANTS_TABLE, 'tcgaPerc', {
          type: Sequelize.FLOAT,
        }, {transaction});

        // copy non-duplicate expression info. from the cnv table
        // into the expression outlier table
        await queryInterface.sequelize.query(`
          INSERT INTO ${EXPRESSION_VARIANTS_TABLE} (ident, rpkm, "foldChange", "tcgaPerc", gene_id, report_id, created_at, updated_at, deleted_at) 
            SELECT ident, "expressionRpkm", "foldChange", "tcgaPerc", gene_id, report_id, created_at, updated_at, deleted_at 
            FROM ${COPY_VARIANTS_TABLE} WHERE id NOT IN (
              SELECT DISTINCT cnv.id 
              FROM ${EXPRESSION_VARIANTS_TABLE} AS outlier INNER JOIN ${COPY_VARIANTS_TABLE} AS cnv 
              ON outlier.rpkm = cnv."expressionRpkm" AND outlier."foldChange" = cnv."foldChange" 
              AND outlier."tcgaPerc" = cnv."tcgaPerc" AND outlier.gene_id = cnv.gene_id AND outlier.report_id = cnv.report_id)`,
        {transaction});

        // replace all na's with null
        await queryInterface.bulkUpdate(EXPRESSION_VARIANTS_TABLE, {copyChange: null}, {copyChange: 'na'}, {transaction});

        // change column type from text to integer
        await queryInterface.changeColumn(EXPRESSION_VARIANTS_TABLE, 'copyChange', {
          type: 'INTEGER USING CAST("copyChange" as INTEGER)',
        }, {transaction});

        // copy non-duplicate copy number info. from the outlier
        // table into the cnv table
        await queryInterface.sequelize.query(`
          INSERT INTO ${COPY_VARIANTS_TABLE} (ident, "ploidyCorrCpChange", "lohState", "cnvState", gene_id, report_id, created_at, updated_at, deleted_at) 
            SELECT ident, "copyChange", "lohState", "cnvState", gene_id, report_id, created_at, updated_at, deleted_at 
            FROM ${EXPRESSION_VARIANTS_TABLE} WHERE id NOT IN (
              SELECT DISTINCT outlier.id 
              FROM ${EXPRESSION_VARIANTS_TABLE} AS outlier INNER JOIN ${COPY_VARIANTS_TABLE} AS cnv 
              ON outlier."copyChange" = cnv."ploidyCorrCpChange" AND outlier."lohState" = cnv."lohState" 
              AND outlier."cnvState" = cnv."cnvState" AND outlier.gene_id = cnv.gene_id AND outlier.report_id = cnv.report_id)`,
        {transaction});

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
    } catch (error) {
      throw error;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
