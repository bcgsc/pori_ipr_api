module.exports = (sequelize, Sq) => sequelize.define('report_change_history', {
  report_id: {
    type: Sq.INTEGER,
    allowNull: false,
    references: {
      model: 'analysis_report',
      key: 'id',
    },
  },
  change_history_id: {
    type: Sq.INTEGER,
    unique: true,
    allowNull: false,
    references: {
      model: 'change_history',
      key: 'id',
    },
  },
},
{
  tableName: 'report_change_history',
  timestamps: false,
});
