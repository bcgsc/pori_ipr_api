const Sq = require('sequelize');
const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize) => {
  return sequelize.define('analysis_report', {
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
    type: {
      type: Sq.ENUM('genomic', 'probe'),
      defaultValue: 'genomic',
      allowNull: false,
    },
    sampleInfo: {
      type: Sq.JSONB,
    },
    seqQC: {
      type: Sq.JSONB,
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
      type: Sq.STRING,
      defaultValue: 'ready',
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
  },
  {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'config', 'createdBy_id', 'deletedAt'],
        },
      },
      extended: {
        attributes: {
          exclude: ['id', 'createdBy_id', 'deletedAt'],
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
          return sequelize.models.analysis_report.destroy({where: {ident: instance.ident}, force: true});
        }
        // get associations from model
        const {
          ReportUserFilter, createdBy, projects, users, ...associations
        } = sequelize.models.analysis_report.associations;
        const promises = [];

        // delete all report associations
        Object.values(associations).forEach((association) => {
          const model = association.target.name;
          promises.push(sequelize.models[model].destroy({where: {reportId: instance.id}}));
        });

        return Promise.all(promises);
      },
    },
  });
};
