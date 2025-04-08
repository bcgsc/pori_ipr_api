module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add column constraints, remove report foreign keys, drop tables
    await queryInterface.sequelize.transaction(async (transaction) => {
      // add patient_id column constraints
      await queryInterface.changeColumn('pog_analysis_reports', 'patient_id', {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
      }, {transaction});

      // drop view because it references the pog_id column on pog_analysis_reports
      // and won't allow me to drop the column on that table
      await queryInterface.sequelize.query('DROP VIEW pog_report_meta', {transaction});

      // after data has been added, remove pog_id and analysis_id columns
      await Promise.all([
        queryInterface.removeColumn('pog_analysis_reports', 'pog_id', {transaction}),
        queryInterface.removeColumn('pog_analysis_reports', 'analysis_id', {transaction}),
      ]);

      // finally delete the POGs and pog_analysis tables
      return Promise.all([
        await queryInterface.dropTable('pog_analysis', {transaction}),
        await queryInterface.dropTable('POGs', {transaction}),
      ]);
    });
    return Promise.resolve();
  },

  down: () => {
    throw new Error('Not implemented');
  },
};
