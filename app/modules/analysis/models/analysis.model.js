const Sq = require('sequelize');

module.exports = sequelize => sequelize.define('pog_analysis',
  {
    id: {
      type: Sq.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ident: {
      type: Sq.UUID,
      unique: true,
      defaultValue: Sq.UUIDV4,
    },
    pog_id: {
      type: Sq.INTEGER,
      references: {
        model: 'POGs',
        key: 'id',
      },
    },
    libraries: {
      type: Sq.JSONB,
      defaultValue: {tumour: null, normal: null, transcriptome: null},
    },
    notes: {
      type: Sq.TEXT,
      allowNull: true,
    },
    clinical_biopsy: {
      type: Sq.STRING,
      allowNull: true,
    },
    analysis_biopsy: {
      type: Sq.STRING,
      allowNull: true,
    },
    bioapps_source_id: {
      type: Sq.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    disease: {
      type: Sq.STRING,
      allowNull: true,
    },
    biopsy_notes: {
      type: Sq.STRING,
      allowNull: true,
    },
    priority: {
      type: Sq.INTEGER,
      defaultValue: 2,
      allowNull: false,
    },
    onco_panel_submitted: {
      type: Sq.DATE,
      allowNull: true,
      defaultValue: null,
    },
    comparator_disease: {
      type: Sq.JSONB,
      allowNull: true,
      defaultValue: '[]',
    },
    comparator_normal: {
      type: Sq.JSONB,
      allowNull: true,
      defaultValue: '{"disease_comparator_for_analysis": null, "gtex_comparator_primary_site": null, "normal_comparator_biopsy_site": null, "normal_comparator_primary_site": null}',
    },
    biopsy_site: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    biopsy_type: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    biopsy_date: {
      type: Sq.DATE,
      allowNull: true,
      defaultValue: null,
    },
    date_analysis: {
      type: Sq.DATE,
      allowNull: true,
      defaultValue: null,
    },
    date_presentation: {
      type: Sq.DATE,
      allowNull: true,
      defaultValue: null,
    },
    threeLetterCode: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
    physician: {
      type: Sq.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    pediatric_id: {
      type: Sq.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'pog_analysis',
    // Automatically create createdAt, updatedAt, deletedAt
    timestamps: true,
    // Use soft-deletes!
    paranoid: true,
    scopes: {
      public: {
        attributes: {
          exclude: ['pog_id', 'deletedAt'],
        },
        include: [
          {as: 'pog', model: sequelize.models.POG.scope('public'), include: [{as: 'projects', model: sequelize.models.project.scope('public')}]},
        ],
      },
    },
  });
