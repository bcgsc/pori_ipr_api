module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // copy all the data from pog_analysis_reports_dga_targeted_genes to pog_analysis_reports_summary_probe_target
      console.log('copying (non duplicate) records from pog_analysis_reports_dga_targeted_genes to pog_analysis_reports_summary_probe_target');
      const recordsToMove = await queryInterface.sequelize.query(
        'SELECT * FROM pog_analysis_reports_dga_targeted_genes',
        {type: queryInterface.sequelize.QueryTypes.SELECT, transaction}
      );
      const delim = '____';
      const rowKey = (row) => {
        return [row.report_id, row.gene, row.variant, row.sample]
          .map((c) => { return c.toString(); })
          .join(delim);
      };

      const currentRecords = (await queryInterface.sequelize.query(
        'SELECT * FROM pog_analysis_reports_summary_probe_target',
        {type: queryInterface.sequelize.QueryTypes.SELECT, transaction}
      )).map(rowKey);

      const dupsFiltered = recordsToMove.filter((row) => {
        return !currentRecords.includes(rowKey(row));
      }).map(({id, ...row}) => {
        return row;
      });

      console.log(`Inserting ${dupsFiltered.length} records into pog_analysis_reports_summary_probe_target`);

      await queryInterface.bulkInsert(
        'pog_analysis_reports_summary_probe_target',
        dupsFiltered,
        {transaction}
      );

      // drop pog_analysis_reports_dga_targeted_genes
      console.log('dropping the table pog_analysis_reports_dga_targeted_genes');
      await queryInterface.dropTable('pog_analysis_reports_dga_targeted_genes', {transaction});

      // rename pog_analysis_reports_summary_probe_target to pog_analysis_reports_probe_results
      console.log('renaming table from pog_analysis_reports_summary_probe_target to pog_analysis_reports_probe_results');
      await queryInterface.renameTable(
        'pog_analysis_reports_summary_probe_target',
        'pog_analysis_reports_probe_results',
        {transaction}
      );

      // remove the pog_id column
      console.log('removing the pog_id column');
      await queryInterface.removeColumn(
        'pog_analysis_reports_probe_results',
        'pog_id',
        {transaction}
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
