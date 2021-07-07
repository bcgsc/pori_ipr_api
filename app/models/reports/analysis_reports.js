const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');
const clearCache = require('../clearCache');

module.exports = (sequelize, Sq) => {
  const report = sequelize.define('analysis_report', {
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
    sampleInfo: {
      type: Sq.JSONB,
      jsonSchema: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
          },
          example: [{Sample: 'Tumour', 'Collection Date': '23-09-20'}],
        },
      },
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
    reportVersion: {
      type: Sq.STRING,
      defaultValue: null,
    },
    kbVersion: {
      type: Sq.STRING,
      defaultValue: null,
    },
    state: {
      type: Sq.ENUM('ready', 'active', 'uploaded', 'signedoff', 'archived', 'reviewed', 'nonproduction'),
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
            sequelize.models.analysis_report.destroy({where: {ident: instance.ident}, force: true}),
          ]);
        }
        // get associations from model
        const {
          ReportUserFilter, createdBy, template, projects, users, ...associations
        } = sequelize.models.analysis_report.associations;

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
