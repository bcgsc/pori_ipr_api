const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

const {Op} = Sq;

module.exports = (sequelize) => {
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
    evidenceLevelGraphkbId: {
      name: 'evidenceLevelGraphkbId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'evidence_level_graphkb_id',
    },
    kbStatementId: {
      name: 'kbStatementId',
      type: Sq.TEXT,
      defaultValue: null,
      field: 'kb_statement_id',
    },
    notes: {
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    hooks: {
      ...DEFAULT_REPORT_OPTIONS.hooks,
      // update ranks after deleting therapeutic target
      afterDestroy: (instance) => {
        return instance.constructor.decrement('rank', {
          where: {
            reportId: instance.reportId,
            rank: {
              [Op.gt]: instance.rank,
            },
          },
        });
      },
    },
    tableName: 'reports_therapeutic_targets',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt']},
      },
    },
  });

  // set instance methods
  therapeuticTarget.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return therapeuticTarget;
};
