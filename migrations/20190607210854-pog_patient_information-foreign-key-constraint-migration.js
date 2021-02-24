module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addConstraint('pog_patient_information', {
        fields: ['pog_report_id'],
        type: 'foreign key',
        name: 'pog_report_id_foreign_key_constraint',
        references: {
          table: 'pog_analysis_reports',
          field: 'id',
        },
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
      queryInterface.changeColumn('pog_patient_information', 'pog_report_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
      }),
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeConstraint('pog_patient_information', 'pog_report_id_foreign_key_constraint', {}),
      queryInterface.changeColumn('pog_patient_information', 'pog_report_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }),
    ]);
  },
};
