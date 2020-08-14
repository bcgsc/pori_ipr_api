const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  const mutationBurden = sequelize.define('mutationBurden', {
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
    role: {
      type: Sq.ENUM(['primary', 'secondary', 'tertiary', 'quarternary']),
      allowNull: false,
    },
    snv: {
      type: Sq.INTEGER,
      defaultValue: null,
    },
    snvTruncating: {
      name: 'snvTruncating',
      field: 'snv_truncating',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    indels: {
      type: Sq.INTEGER,
      defaultValue: null,
    },
    indelsFrameshift: {
      name: 'indelsFrameshift',
      field: 'indels_frameshift',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    sv: {
      type: Sq.INTEGER,
      defaultValue: null,
    },
    svExpressed: {
      name: 'svExpressed',
      field: 'sv_expressed',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    snvPercentile: {
      name: 'snvPercentile',
      field: 'snv_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    indelPercentile: {
      name: 'indelPercentile',
      field: 'indel_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    svPercentile: {
      name: 'svPercentile',
      field: 'sv_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_mutation_burden',
    indexes: [
      ...DEFAULT_REPORT_OPTIONS.indexes,
      {
        unique: true,
        fields: ['report_id', 'role'],
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
          exclude: ['id', 'reportId', 'deletedAt'],
        },
      },
    },
  });

  // set instance methods
  mutationBurden.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mutationBurden;
};
