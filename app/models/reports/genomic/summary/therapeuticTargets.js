const {
  DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS, REMOVE_REPORT_SIGNATURES,
} = require('../../../base');

module.exports = (sequelize, Sq) => {
  const therapeuticTarget = sequelize.define('therapeuticTarget', {
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
    type: {
      type: Sq.ENUM('therapeutic', 'chemoresistance'),
      allowNull: false,
    },
    rank: {
      type: Sq.INTEGER,
      defaultValue: 0,
    },
    gene: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    geneGraphkbId: {
      name: 'geneGraphkbId',
      field: 'gene_graphkb_id',
      type: Sq.TEXT,
      defaultValue: null,
    },
    variant: {
      type: Sq.TEXT,
      allowNull: false,
    },
    variantGraphkbId: {
      name: 'variantGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'variant_graphkb_id',
    },
    signature: {
      type: Sq.TEXT,
      defaultValue: null,
    },
    signatureGraphkbId: {
      name: 'signatureGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'signature_graphkb_id',
    },
    therapy: {
      type: Sq.STRING,
      allowNull: false,
    },
    therapyGraphkbId: {
      name: 'therapyGraphkbId',
      type: Sq.TEXT,
      field: 'therapy_graphkb_id',
      defaultValue: null,
    },
    context: {
      type: Sq.TEXT,
      allowNull: false,
    },
    contextGraphkbId: {
      name: 'contextGraphkbId',
      field: 'context_graphkb_id',
      type: Sq.TEXT,
      defaultValue: null,
    },
    evidenceLevel: {
      name: 'evidenceLevel',
      field: 'evidence_level',
      type: Sq.TEXT,
      defaultValue: null,
    },
    iprEvidenceLevel: {
      name: 'iprEvidenceLevel',
      field: 'ipr_evidence_level',
      type: Sq.TEXT,
      defaultValue: null,
    },
    evidenceLevelGraphkbId: {
      name: 'evidenceLevelGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'evidence_level_graphkb_id',
    },
    kbStatementIds: {
      name: 'kbStatementIds',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'kb_statement_ids',
    },
    notes: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    hooks: {
      ...DEFAULT_REPORT_OPTIONS.hooks,
      // update ranks after deleting therapeutic target
      afterDestroy: async (instance) => {
        await instance.constructor.decrement('rank', {
          where: {
            reportId: instance.reportId,
            rank: {
              [Sq.Op.gt]: instance.rank,
            },
          },
        });
        return REMOVE_REPORT_SIGNATURES(instance);
      },
    },
    tableName: 'reports_therapeutic_targets',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
      publicWithoutRank: {
        attributes: {exclude: ['id', 'reportId', 'rank', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  therapeuticTarget.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    if (scope === 'publicWithoutRank') {
      const {id, reportId, deletedAt, updatedBy, rank, ...view} = this.dataValues;
      return view;
    }
    return this;
  };

  return therapeuticTarget;
};
