const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const userGroup = sequelize.define('userGroup', {
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
    group: {
      type: Sq.ENUM(
        'admin',
        'manager',
        'report assignment access',
        'create report access',
        'germline access',
        'non-production access',
        'unreviewed access',
        'all projects access',
        'template edit access',
        'appendix edit access',
        'variant-text edit access',
      ),
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'user_groups',
    scopes: {
      public: {
        order: [['user_id', 'ASC']],
        attributes: {
          exclude: ['id', 'deletedAt', 'updatedBy'],
        },
        include: [
          {as: 'users', model: sequelize.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
        ],
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
