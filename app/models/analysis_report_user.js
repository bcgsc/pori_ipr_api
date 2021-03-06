const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = (sequelize, Sq) => {
  return sequelize.define('analysis_reports_user', {
    ...DEFAULT_COLUMNS,
    role: {
      type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'reviewer', 'admin'),
      allowNull: false,
    },
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    user_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    addedBy_id: {
      type: Sq.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_users',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'user_id'],
        },
        include: [
          {model: sequelize.models.user.scope('public'), as: 'user'},
        ],
      },
    },
  });
};
