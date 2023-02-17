const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const project = sequelize.define('project', {
    ...DEFAULT_COLUMNS,
    name: {
      type: Sq.STRING,
      allowNull: false,
      jsonSchema: {
        schema: {type: 'string', minLength: 2},
      },
    },
    description: {
      type: Sq.TEXT,
      defaultValue: null,
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
          exclude: ['id', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  project.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    if (scope === 'nonMaster') {
      const {id, deletedAt, updatedBy, users, reports, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return project;
};
