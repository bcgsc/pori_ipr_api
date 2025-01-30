const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../../../base');

module.exports = (sequelize, Sq) => {
  const microbial = sequelize.define('microbial', {
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
    species: {
      type: Sq.TEXT,
    },
    integrationSite: {
      type: Sq.TEXT,
    },
    microbialHidden: {
      name: 'microbialHidden',
      field: 'microbial_hidden',
      type: Sq.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      jsonSchema: {
        description: 'Microbial Hidden',
      },
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_summary_microbial',
    scopes: {
      public: {
        attributes: {
          exclude: ['id', 'reportId', 'deletedAt', 'updatedBy'],
        },
      },
    },
  });

  // set instance methods
  microbial.prototype.view = function (scope) {
    if (scope === 'public') {
      const {id, reportId, deletedAt, updatedBy, ...publicView} = this.dataValues;
      return publicView;
    }
    return this;
  };

  return microbial;
};
