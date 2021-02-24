const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
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
