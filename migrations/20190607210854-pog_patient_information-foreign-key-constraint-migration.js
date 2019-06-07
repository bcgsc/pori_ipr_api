'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.addConstraint('pog_patient_information', ['pog_report_id'], {
      type: 'foreign key',
      name: 'pog_report_id_foreign_key_constraint',
      references: { //Required field
        table: 'pog_analysis_reports',
        field: 'id',
      },
      onDelete: 'cascade',
      onUpdate: 'cascade',
    });
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   return queryInterface.removeConstraint('pog_patient_information', 'pog_report_id_foreign_key_constraint', {});
  }
};
