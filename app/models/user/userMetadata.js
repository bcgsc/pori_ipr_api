const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const userMetadata = sequelize.define('userMetadata', {
    ...DEFAULT_COLUMNS,
    userId: {
      name: 'userId',
      field: 'user_id',
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      allowNull: false,
    },
    settings: {
      type: Sq.JSONB,
      allowNull: false,
      defaultValue: {},
      jsonSchema: {
        schema: {
          type: 'object',
        },
      },
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'user_metadata',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'userId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  userMetadata.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, userId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return userMetadata;
};
