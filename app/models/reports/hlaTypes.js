const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const hlaTypes = sequelize.define('hlaTypes', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      allowNull: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    pathology: {
      type: Sq.ENUM(['diseased', 'normal']),
      allowNull: false,
    },
    protocol: {
      type: Sq.ENUM(['DNA', 'RNA']),
      allowNull: false,
    },
    a1: {
      type: Sq.TEXT,
    },
    a2: {
      type: Sq.TEXT,
    },
    b1: {
      type: Sq.TEXT,
    },
    b2: {
      type: Sq.TEXT,
    },
    c1: {
      type: Sq.TEXT,
    },
    c2: {
      type: Sq.TEXT,
    },
    reads: {
      type: Sq.FLOAT,
    },
    objective: {
      type: Sq.FLOAT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_hla_types',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  hlaTypes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return hlaTypes;
};
