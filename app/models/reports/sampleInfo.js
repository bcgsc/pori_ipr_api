const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const sampleInfo = sequelize.define('sampleInfo', {
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
    sample: {
      type: Sq.TEXT,
    },
    pathoTc: {
      name: 'pathoTc',
      field: 'patho_tc',
      type: Sq.TEXT,
    },
    biopsySite: {
      name: 'biopsySite',
      field: 'biopsy_site',
      type: Sq.TEXT,
    },
    biopsyType: {
      name: 'biopsyType',
      field: 'biopsy_type',
      type: Sq.TEXT,
    },
    sampleName: {
      name: 'sampleName',
      field: 'sample_name',
      type: Sq.TEXT,
    },
    primarySite: {
      name: 'primarySite',
      field: 'primary_site',
      type: Sq.TEXT,
    },
    collectionDate: {
      name: 'collectionDate',
      field: 'collection_date',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_sample_info',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  sampleInfo.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return sampleInfo;
};
