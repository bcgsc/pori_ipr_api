const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../../../base');

module.exports = (sequelize) => {
  return sequelize.define('presentation_slides', {
    ...DEFAULT_COLUMNS,
    report_id: {
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    user_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    name: {
      type: Sq.TEXT,
      allowNull: false,
    },
    object: {
      type: Sq.TEXT,
      allowNull: true,
    },
    object_type: {
      type: Sq.TEXT,
      allowNull: false,
    },
  },
  {
    ...DEFAULT_OPTIONS,
    tableName: 'reports_presentation_slides',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'report_id', 'deletedAt'],
        },
      },
    },
  });
};
