const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = (sequelize, Sq) => {
  const reportUser = sequelize.define(
    'reportUser',
    {
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
            exclude: ['id', 'reportId', 'user_id', 'updatedBy'],
          },
          include: [
            {model: sequelize.models.user.scope('public'), as: 'user'},
          ],
        },
      },
    },
  );

  // set instance methods
  reportUser.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, user_id, addedBy_id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return reportUser;
};
