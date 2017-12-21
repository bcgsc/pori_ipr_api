"use strict";
module.exports = (sequelize, Sq) => {
  return sequelize.define('pog_analysis',
    {
      id: {
        type: Sq.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      ident: {
        type: Sq.UUID,
        unique: true,
        defaultValue: Sq.UUIDV4
      },
      pog_id: {
        type: Sq.INTEGER,
        references: {
          model: 'POGs',
          key: 'id',
        }
      },
      libraries: {
        type: Sq.JSONB,
        defaultValue: { tumour: null, normal: null, transcriptome: null }
      },
      notes: {
        type: Sq.TEXT,
        allowNull: true
      },
      clinical_biopsy: {
        type: Sq.STRING,
        allowNull: true,
        validate: {
          /*in: {
            args: /^(biospec_[0-9]*)$/,
            msg: 'The provided clinical biopsy id must be in the form of: biospec_n'
          }*/
        }
      },
      analysis_biopsy: {
        type: Sq.STRING,
        allowNull: true,
        validate: {
          /*in: {
            args: /^(biop_[0-9]*)$/,
            msg: '/The analysis biopsy id must be in the form if: biop_n'
          }*/
        }
      },
      bioapps_source_id: {
        type: Sq.INTEGER,
        defaultValue: null
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
        allowNull: false
      },
      onco_panel_submitted: {
        type: Sq.DATE,
        defaultValue: null
      },
      comparator_disease: {
        type: Sq.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      comparator_normal: {
        type: Sq.JSONB,
        allowNull: true,
        defaultValue: '{"disease_comparator_for_analysis": null, "gtex_comparator_primary_site": null, "normal_comparator_biopsy_site": null, "normal_comparator_primary_site": null}'
      },
      biopsy_site: {
        type: Sq.STRING,
        defaultValue: null,
      },
      biopsy_type: {
        type: Sq.STRING,
        defaultValue: null,
      },
      biopsy_date: {
        type: Sq.DATE,
        defaultValue: null
      },
      date_analysis: {
        type: Sq.DATE,
        defaultValue: null
      },
      date_presentation: {
        type: Sq.DATE,
        defaultValue: null
      },
      threeLetterCode: {
        type: Sq.STRING,
        defaultValue: null
      },
      physician: {
        type: Sq.JSONB,
        defaultValue: null
      }
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
            exclude: ['id', 'pog_id', 'deletedAt']
          },
          include: [
            { as: 'pog', model: sequelize.models.POG.scope('public') }
          ]
        }
      }
    });
};

