const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const genes = sequelize.define('genes', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      unique: false,
      allowNull: false,
      references: {
        model: 'reports',
        key: 'id',
      },
    },
    name: {
      type: Sq.TEXT,
      allowNull: false,
    },
    tumourSuppressor: {
      name: 'tumourSuppressor',
      field: 'tumour_suppressor',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    oncogene: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    cancerRelated: {
      name: 'cancerRelated',
      field: 'cancer_related',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    drugTargetable: {
      name: 'drugTargetable',
      field: 'drug_targetable',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    knownFusionPartner: {
      name: 'knownFusionPartner',
      field: 'known_fusion_partner',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    therapeuticAssociated: {
      name: 'therapeuticAssociated',
      field: 'therapeutic_associated',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    knownSmallMutation: {
      name: 'knownSmallMutation',
      field: 'known_small_mutation',
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_genes',
    indexes: [
      ...DEFAULT_REPORT_OPTIONS.indexes,
      {
        unique: true,
        fields: ['report_id', 'name'],
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
      minimal: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'createdAt', 'updatedAt', 'ident']},
      },
    },
  });

  // set instance methods
  genes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return genes;
};
