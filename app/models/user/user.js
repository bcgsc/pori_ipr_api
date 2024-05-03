const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const user = sequelize.define('user', {
    ...DEFAULT_COLUMNS,
    username: {
      type: Sq.STRING,
      allowNull: false,
      jsonSchema: {
        schema: {type: 'string', minLength: 2},
      },
    },
    password: {
      type: Sq.STRING,
      jsonSchema: {
        schema: {type: 'string', minLength: 8},
      },
    },
    type: {
      type: Sq.ENUM('bcgsc', 'local'),
      defaultValue: 'local',
    },
    allowNotifications: {
      name: 'allowNotifications',
      field: 'allow_notifications',
      type: Sq.BOOLEAN,
      defaultValue: true,
    },
    firstName: {
      type: Sq.STRING,
      allowNull: false,
      jsonSchema: {
        schema: {type: 'string', minLength: 2},
      },
    },
    lastName: {
      type: Sq.STRING,
      allowNull: false,
      jsonSchema: {
        schema: {type: 'string', minLength: 2},
      },
    },
    email: {
      type: Sq.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
      jsonSchema: {
        schema: {type: 'string', format: 'email'},
      },
    },
  }, {
    ...DEFAULT_OPTIONS,
    indexes: [
      ...DEFAULT_OPTIONS.indexes || [],
      {
        unique: true,
        fields: ['username'],
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
          exclude: ['id', 'deletedAt', 'password', 'updatedBy'],
        },
      },
      minimal: {
        attributes: ['ident', 'username'],
      },
    },
  });

  // set instance methods
  user.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, deletedAt, password, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return user;
};
