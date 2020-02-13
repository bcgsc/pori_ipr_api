const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = sequelize => sequelize.define('project', {
  ...DEFAULT_COLUMNS,
  name: {
    type: Sq.STRING,
    allowNull: false,
  },
},
{
  ...DEFAULT_OPTIONS,
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
