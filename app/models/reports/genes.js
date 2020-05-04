const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define(
    'genes',
    {
      ...DEFAULT_COLUMNS,
      reportId: {
        type: Sq.INTEGER,
        unique: false,
        allowNull: false,
        field: 'report_id',
        name: 'reportId',
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
        type: Sq.BOOLEAN,
        defaultValue: false,
        field: 'tumour_suppressor',
        name: 'tumourSuppressor',
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
    },
    {
      ...DEFAULT_OPTIONS,
      tableName: 'reports_genes',
      indexes: [
        ...DEFAULT_OPTIONS.indexes,
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
    }
  );
};
