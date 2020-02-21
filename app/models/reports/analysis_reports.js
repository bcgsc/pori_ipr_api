const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = sequelize => sequelize.define('analysis_report', {
  ...DEFAULT_COLUMNS,
  patient_id: {
    type: Sq.STRING,
    unique: false,
    allowNull: false,
  },
  age_of_consent: {
    type: Sq.INTEGER,
  },
  alternate_identifier: {
    type: Sq.STRING,
  },
  biopsy_name: {
    type: Sq.STRING,
    allowNull: true,
  },
  biopsy_date: {
    type: Sq.DATE,
    defaultValue: null,
  },
  presentation_date: {
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
},
{
  ...DEFAULT_OPTIONS,
  tableName: 'pog_analysis_reports',
  scopes: {
    public: {
      attributes: {
        exclude: ['id', 'createdBy_id', 'deletedAt'],
      },
    },
    extended: {
      attributes: {
        exclude: ['id', 'createdBy_id', 'deletedAt'],
      },
    },
  },
  hooks: {
    ...DEFAULT_OPTIONS.hooks,
    afterDestroy: async (instance) => {
      // get associations from model
      const {
        ReportUserFilter, createdBy, projects, users, ...associations
      } = sequelize.models.analysis_report.associations;
      const promises = [];

      // delete all report associations
      Object.values(associations).forEach((association) => {
        const model = association.target.name;
        promises.push(sequelize.models[model].destroy({where: {report_id: instance.id}}));
      });

      return Promise.all(promises);
    },
  },
});
