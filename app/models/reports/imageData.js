const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('imageData', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    format: {
      type: Sq.ENUM('PNG', 'JPG'),
      defaultValue: 'PNG',
    },
    filename: {
      type: Sq.TEXT,
      allowNull: false,
    },
    key: {
      type: Sq.TEXT,
      allowNull: false,
    },
    data: {
      type: Sq.TEXT,
      allowNull: false,
    },
    title: {
      type: Sq.TEXT,
    },
    caption: {
      type: Sq.TEXT,
    },
  },
  {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_image_data',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });
};
