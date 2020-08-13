const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const comparators = sequelize.define('comparators', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    analysisRole: {
      name: 'analysisRole',
      field: 'analysis_role',
      type: Sq.ENUM([
        'cibersort (primary)',
        'cibersort (secondary)',
        'mixcr (primary)',
        'mixcr (secondary)',
        'HRD (primary)',
        'HRD (secondary)',
        'expression (disease)',
        'expression (disease QC)',
        'expression (primary site)',
        'expression (primary site QC)',
        'expression (biopsy site)',
        'expression (biopsy site QC)',
        'mutation burden (primary)',
        'mutation burden (secondary)',
        'mutation burden (tertiary)',
        'mutation burden (quaternary)',
        'protein expression (primary)',
        'protein expression (secondary)',
      ]),
      allowNull: false,
    },
    name: {
      type: Sq.TEXT,
      allowNull: false,
    },
    version: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    description: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    size: {
      type: Sq.INTEGER,
      defaultValue: null,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_comparators',
    indexes: [
      ...DEFAULT_REPORT_OPTIONS.indexes,
      {
        unique: true,
        fields: ['report_id', 'analysis_role'],
        where: {
          deleted_at: {
            [Sq.Op.eq]: null,
          },
        },
      },
    ],
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  comparators.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return comparators;
};
