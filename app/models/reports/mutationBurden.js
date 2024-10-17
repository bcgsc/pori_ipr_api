const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
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
      type: Sq.ENUM(['primary', 'secondary', 'tertiary', 'quaternary', null]),
      defaultValue: null,
    },
    codingSnvCount: {
      name: 'codingSnvCount',
      field: 'coding_snv_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of non synonymous coding snvs',
      },
    },
    truncatingSnvCount: {
      name: 'truncatingSnvCount',
      field: 'truncating_snv_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of non synonymous coding snvs which are also truncating',
      },
    },
    codingIndelsCount: {
      name: 'codingIndelsCount',
      field: 'coding_indels_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of non synonymous coding indels',
      },
    },
    frameshiftIndelsCount: {
      name: 'frameshiftIndelsCount',
      field: 'frameshift_indels_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of non synonymous coding indels which result in a frameshift',
      },
    },
    qualitySvCount: {
      name: 'qualitySvCount',
      field: 'quality_sv_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of high quality svs',
      },
    },
    qualitySvExpressedCount: {
      name: 'qualitySvExpressedCount',
      field: 'quality_sv_expressed_count',
      type: Sq.INTEGER,
      defaultValue: null,
      jsonSchema: {
        description: 'number of high quality svs which are expressed in the RNA',
      },
    },
    codingSnvPercentile: {
      name: 'codingSnvPercentile',
      field: 'coding_snv_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    codingIndelPercentile: {
      name: 'codingIndelPercentile',
      field: 'coding_indel_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    qualitySvPercentile: {
      name: 'qualitySvPercentile',
      field: 'quality_sv_percentile',
      type: Sq.INTEGER,
      defaultValue: null,
    },
    totalSnvCount: {
      name: 'totalSnvCount',
      field: 'total_snv_count',
      type: Sq.INTEGER,
      jsonSchema: {
        description: 'total number of somatic SNVs in the genome',
      },
    },
    totalIndelCount: {
      name: 'totalIndelCount',
      field: 'total_indel_count',
      type: Sq.INTEGER,
      jsonSchema: {
        description: 'total number of somatic indels in the genome',
      },
    },
    totalMutationsPerMb: {
      name: 'totalMutationsPerMb',
      field: 'total_mutations_per_mb',
      type: Sq.FLOAT,
      jsonSchema: {
        description: 'somatic indels and SNVs per megabase in the genome',
      },
    },
    svBurdenHidden: {
      name: 'svBurdenHidden',
      field: 'sv_burden_hidden',
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      jsonSchema: {
        description: 'SV Burden Hidden',
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_mutation_burden',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  mutationBurden.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return mutationBurden;
};
