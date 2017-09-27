"use strict";

module.exports = (sequelize) => {
  
  let recent_report = sequelize.import(__dirname + '/recentReport.model'); // Order is important
  
  recent_report.belongsTo(sequelize.models.analysis_report, {as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true});
  recent_report.belongsTo(sequelize.models.user, {as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true});
  
};
