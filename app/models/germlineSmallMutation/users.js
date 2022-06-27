const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const germlineReportUser = sequelize.define(
    'germlineReportUser',
    {
      ...DEFAULT_COLUMNS,
      role: {
        type: Sq.ENUM('clinician', 'bioinformatician', 'analyst', 'reviewer', 'admin'),
        allowNull: false,
      },
      germlineReportId: {
        name: 'germlineReportId',
        field: 'germline_report_id',
        type: Sq.INTEGER,
        allowNull: false,
        references: {
          model: 'germline_small_mutations',
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
      addedById: {
        name: 'addedById',
        field: 'added_by_id',
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
      tableName: 'germline_report_users',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'germlineReportId', 'user_id', 'addedById', 'deletedAt', 'updatedBy'],
          },
          include: [
            {model: sequelize.models.user.scope('public'), as: 'user'},
          ],
        },
      },
    },
  );

  // set instance methods
  germlineReportUser.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, germlineReportId, user_id, addedById, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return germlineReportUser;
};
