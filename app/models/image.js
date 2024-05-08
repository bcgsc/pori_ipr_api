const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = (sequelize, Sq) => {
  const image = sequelize.define('image', {
    ...DEFAULT_COLUMNS,
    filename: {
      type: Sq.TEXT,
      allowNull: false,
    },
    data: {
      type: Sq.TEXT,
      allowNull: false,
    },
    format: {
      type: Sq.STRING,
      allowNull: false,
    },
    type: {
      type: Sq.STRING,
      allowNull: false,
    },
    key: {
      type: Sq.STRING,
      allowNull: false,
    },
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'images',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt', 'updatedBy'],
        },
      },
      keylist: {
        attributes: {
          exclude: ['id', 'deletedAt', 'updatedBy', 'data'],
        },
      },
    },
  });

  // set instance methods
  image.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    if (scope === 'keylist') {
      const {id, deletedAt, updatedBy, exclue, ...keylistView} = this.dataValues;
      return keylistView;
    }
    return this;
  };

  return image;
};
