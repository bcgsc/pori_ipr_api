const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const immuneCellTypes = sequelize.define('immuneCellTypes', {
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
    cellType: {
      name: 'cellType',
      field: 'cell_type',
      type: Sq.TEXT,
      allowNull: false,
    },
    kbCategory: {
      name: 'kbCategory',
      field: 'kb_category',
      type: Sq.TEXT,
    },
    score: {
      type: Sq.FLOAT,
    },
    percentile: {
      type: Sq.FLOAT,
    },
    pedsScore: {
      name: 'pedsScore',
      field: 'peds_score',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Pediatric CD8+ T-cell Score',
      },
    },
    pedsPercentile: {
      name: 'pedsPercentile',
      field: 'peds_percentile',
      type: Sq.FLOAT,
      defaultValue: null,
      jsonSchema: {
        description: 'Pediatric CD8+ T-cell Percentile',
      },
    },
    pedsScoreComment: {
      name: 'pedsScoreComment',
      field: 'peds_score_comment',
      type: Sq.TEXT,
      defaultValue: null,
      jsonSchema: {
        description: 'Pediatric CD8+ T-cell Score Comment',
      },
    },
    percentileHidden: {
      name: 'percentileHidden',
      field: 'percentile_hidden',
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_immune_cell_types',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  immuneCellTypes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return immuneCellTypes;
};
