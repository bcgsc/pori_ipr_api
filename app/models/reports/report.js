const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');
const clearCache = require('../clearCache');

module.exports = (sequelize, Sq) => {
  const report = sequelize.define('report', {
    ...DEFAULT_COLUMNS,
    patientId: {
      name: 'patientId',
      field: 'patient_id',
      type: Sq.STRING,
      unique: false,
      allowNull: false,
    },
    ageOfConsent: {
      name: 'ageOfConsent',
      field: 'age_of_consent',
      type: Sq.INTEGER,
    },
    captiv8Score: {
      name: 'captiv8Score',
      field: 'captiv8_score',
      type: Sq.INTEGER,
    },
    hrdetectScore: {
      name: 'hrdetectScore',
      field: 'hrdetect_score',
      type: Sq.FLOAT,
    },
    genomeTmb: {
      name: 'genomeTmb',
      field: 'genome_tmb',
      type: Sq.FLOAT,
    },
    alternateIdentifier: {
      name: 'alternateIdentifier',
      field: 'alternate_identifier',
      type: Sq.STRING,
    },
    biopsyName: {
      name: 'biopsyName',
      field: 'biopsy_name',
      type: Sq.STRING,
      allowNull: true,
    },
    biopsyDate: {
      name: 'biopsyDate',
      field: 'biopsy_date',
      type: Sq.DATE,
      defaultValue: null,
    },
    presentationDate: {
      name: 'presentationDate',
      field: 'presentation_date',
      type: Sq.DATE,
      defaultValue: null,
    },
    createdBy_id: {
      type: Sq.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    templateId: {
      name: 'templateId',
      field: 'template_id',
      type: Sq.INTEGER,
      references: {
        model: 'templates',
        key: 'id',
      },
      allowNull: false,
    },
    seqQC: {
      type: Sq.JSONB,
      jsonSchema: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
          example: [{Reads: '2534M', bioQC: 'passed'}],
        },
      },
    },
    config: {
      type: Sq.TEXT,
    },
    appendix: {
      type: Sq.TEXT,
    },
    reportVersion: {
      type: Sq.STRING,
      defaultValue: null,
    },
    kbVersion: {
      type: Sq.STRING,
      defaultValue: null,
    },
    state: {
      type: Sq.ENUM('ready', 'active', 'uploaded', 'signedoff', 'completed', 'reviewed', 'nonproduction'),
      defaultValue: 'ready',
      allowNull: false,
    },
    expression_matrix: {
      type: Sq.STRING,
      defaultValue: 'v8',
    },
    kbUrl: {
      name: 'kbUrl',
      field: 'kb_url',
      type: Sq.STRING,
      defaultValue: null,
    },
    kbDiseaseMatch: {
      name: 'kbDiseaseMatch',
      field: 'kb_disease_match',
      type: Sq.STRING,
      defaultValue: null,
    },
    tumourContent: {
      name: 'tumourContent',
      field: 'tumour_content',
      type: Sq.FLOAT,
    },
    m1m2Score: {
      name: 'm1m2Score',
      field: 'm1m2_score',
      type: Sq.FLOAT,
    },
    ploidy: {
      type: Sq.TEXT,
    },
    subtyping: {
      type: Sq.TEXT,
    },
    analysisStartedAt: {
      name: 'analysisStartedAt',
      field: 'analysis_started_at',
      type: Sq.DATE,
      defaultValue: null,
    },
    pediatricIds: {
      name: 'pediatricIds',
      field: 'pediatric_ids',
      type: Sq.TEXT,
    },
    oncotreeTumourType: {
      name: 'oncotreeTumourType',
      field: 'oncotree_tumour_type',
      type: Sq.TEXT,
      defaultValue: null,
    },
    legacyReportFilepath: {
      name: 'legacyReportFilepath',
      field: 'legacy_report_filepath',
      type: Sq.STRING,
      defaultValue: null,
    },
    legacyPresentationFilepath: {
      name: 'legacyPresentationFilepath',
      field: 'legacy_presentation_filepath',
      type: Sq.STRING,
      defaultValue: null,
    },
    uploadContents: {
      name: 'uploadContents',
      field: 'upload_contents',
      type: Sq.JSONB,
      jsonSchema: {
        schema: {
          type: 'object',
        },
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'config', 'createdBy_id', 'templateId', 'deletedAt', 'updatedBy'],
        },
      },
      extended: {
        attributes: {
          exclude: ['id', 'createdBy_id', 'templateId', 'deletedAt', 'updatedBy'],
        },
      },
    },
    hooks: {
      ...DEFAULT_REPORT_OPTIONS.hooks,
      // NOTE: This hook only gets triggered on instance.destroy or
      // when individualHooks is set to true
      afterDestroy: async (instance, options = {force: false}) => {
        if (options.force === true) {
          // when hard deleting a report, also delete the "updated" versions of the report
          return Promise.all([
            clearCache(instance, 'DELETE'),
            sequelize.models.report.destroy({where: {ident: instance.ident}, force: true}),
          ]);
        }
        // get associations from model
        const {
          ReportUserFilter, createdBy, template, projects, users, ...associations
        } = sequelize.models.report.associations;

        const promises = [
          clearCache(instance, 'DELETE'),
        ];

        // delete all report associations
        Object.values(associations).forEach((association) => {
          const model = association.target.name;
          promises.push(sequelize.models[model].destroy({where: {reportId: instance.id}}));
        });

        return Promise.all(promises);
      },
    },
  });

  // set instance methods
  report.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, config, createdBy_id, templateId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return report;
};
