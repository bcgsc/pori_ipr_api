const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('./base');

module.exports = (sequelize) => {
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
  }, {
    ...DEFAULT_OPTIONS,
    tableName: 'images',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  image.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return image;
};
