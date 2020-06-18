const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const project = sequelize.define('project', {
    ...DEFAULT_COLUMNS,
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'projects',
    indexes: [
      ...DEFAULT_OPTIONS.indexes || [],
      {
        unique: true,
        fields: ['name'],
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      },
    ],
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt'],
        },
      },
      middleware: {
        include: [
          {as: 'users', model: sequelize.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'jiraToken', 'jiraXsrf', 'settings', 'user_project']}, through: {attributes: []}},
          {as: 'reports', model: sequelize.models.analysis_report, attributes: ['ident', 'patientId', 'alternateIdentifier', 'createdAt', 'updatedAt'], through: {attributes: []}},
        ],
      },
    },
  });

  // set instance methods
  project.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return project;
};
