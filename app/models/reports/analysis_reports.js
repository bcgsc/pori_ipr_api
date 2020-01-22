const Sq = require('sequelize');

const {DEFAULT_COLUMNS, DEFAULT_OPTIONS} = require('../base');

module.exports = sequelize => sequelize.define('analysis_report', {
  ...DEFAULT_COLUMNS,
  pog_id: {
    type: Sq.INTEGER,
    references: {
      model: 'POGs',
      key: 'id',
    },
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
    allowNull: true,
    defaultValue: null,
  },
  kbVersion: {
    type: Sq.STRING,
    allowNull: true,
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
        exclude: ['id', 'pog_id', 'createdBy_id', 'deletedAt'],
      },
    },
    extended: {
      attributes: {
        exclude: ['id', 'pog_id', 'createdBy_id', 'deletedAt'],
      },
      include: [
        {model: sequelize.models.POG, as: 'pog'},
        {model: sequelize.models.pog_analysis, as: 'analysis'},
      ],
    },
  },
  hooks: {
    ...DEFAULT_OPTIONS.hooks,
    afterDestroy: async (instance) => {
      // get associations from model
      const {pog, analysis, ReportUserFilter, createdBy, ...associations} = sequelize.models.analysis_report.associations;
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
