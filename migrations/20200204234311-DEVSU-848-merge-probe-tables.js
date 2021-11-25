module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // copy all the data from pog_analysis_reports_dga_targeted_genes to pog_analysis_reports_summary_probe_target
      console.log('copying (non duplicate) records from pog_analysis_reports_dga_targeted_genes to pog_analysis_reports_summary_probe_target');

      // select only records that are not duplicated in the other equivalent table
      const recordsToMove = await queryInterface.sequelize.query(
        `SELECT * FROM pog_analysis_reports_dga_targeted_genes genet WHERE NOT EXISTS (
          SELECT * FROM pog_analysis_reports_summary_probe_target probet WHERE (
            probet.gene = genet.gene
            AND probet.variant = genet.variant
            AND probet.sample = genet.sample
            AND probet.report_id = genet.report_id
          )
        )`,
        {type: queryInterface.sequelize.QueryTypes.SELECT, transaction},
      );

      console.log(`Inserting ${recordsToMove.length} records into pog_analysis_reports_summary_probe_target`);

      await queryInterface.bulkInsert(
        'pog_analysis_reports_summary_probe_target',
        recordsToMove.map(({id, ...row}) => {
          return row;
        }), // remove the id, let the table re-generate PK
        {transaction},
      );

      // drop pog_analysis_reports_dga_targeted_genes
      console.log('dropping the table pog_analysis_reports_dga_targeted_genes');
      await queryInterface.dropTable('pog_analysis_reports_dga_targeted_genes', {transaction});

      // rename pog_analysis_reports_summary_probe_target to pog_analysis_reports_probe_results
      console.log('renaming table from pog_analysis_reports_summary_probe_target to pog_analysis_reports_probe_results');
      await queryInterface.renameTable(
        'pog_analysis_reports_summary_probe_target',
        'pog_analysis_reports_probe_results',
        {transaction},
      );

      // remove the pog_id column
      console.log('removing the pog_id column');
      await queryInterface.removeColumn(
        'pog_analysis_reports_probe_results',
        'pog_id',
        {transaction},
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
