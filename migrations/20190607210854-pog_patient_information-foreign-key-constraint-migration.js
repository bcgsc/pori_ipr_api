'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addConstraint('pog_patient_information', ['pog_report_id'], {
      type: 'foreign key',
      name: 'pog_report_id_foreign_key_constraint',
      references: {
        table: 'pog_analysis_reports',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
      allowNull: false,
    });
  },

  down: function (queryInterface, Sequelize) {
   return queryInterface.removeConstraint('pog_patient_information', 'pog_report_id_foreign_key_constraint', {});
  }
};
