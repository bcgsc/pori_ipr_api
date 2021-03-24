const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const user = sequelize.define('user', {
    ...DEFAULT_COLUMNS,
    username: {
      type: Sq.STRING,
      allowNull: false,
    },
    password: {
      type: Sq.STRING,
    },
    type: {
      type: Sq.ENUM('bcgsc', 'local'),
      defaultValue: 'local',
    },
    firstName: {
      type: Sq.STRING,
    },
    lastName: {
      type: Sq.STRING,
    },
    email: {
      type: Sq.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
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
          exclude: ['id', 'deletedAt', 'password'],
        },
      },
    },
  });

  // set instance methods
  user.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, deletedAt, password, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return user;
};
