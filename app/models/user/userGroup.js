const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const userGroup = sequelize.define('userGroup', {
    ...DEFAULT_COLUMNS,
    name: {
      type: Sq.STRING,
      allowNull: false,
    },
    description: {
      type: Sq.STRING,
      allowNull: true,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'user_groups',
    scopes: {
      public: {
        order: [['name', 'ASC']],
        attributes: {
          exclude: ['id', 'deletedAt', 'updatedBy'],
        },
        include: [
          {as: 'users', model: sequelize.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}, through: {attributes: []}},
        ],
      },
      minimal: {
        attributes: ['ident', 'name'],
      },
    },
  });

  // set instance methods
  userGroup.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return userGroup;
};
