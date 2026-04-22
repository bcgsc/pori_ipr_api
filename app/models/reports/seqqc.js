const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const seqQC = sequelize.define('seqQC', {
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
    reads: {
      name: 'Reads',
      field: 'reads',
      type: Sq.TEXT,
    },
    bioQC: {
      name: 'bioQC',
      field: 'bio_qc',
      type: Sq.TEXT,
    },
    labQC: {
      name: 'labQC',
      field: 'lab_qc',
      type: Sq.TEXT,
    },
    sample: {
      name: 'Sample',
      field: 'sample',
      type: Sq.TEXT,
    },
    library: {
      name: 'Library',
      field: 'library',
      type: Sq.TEXT,
    },
    coverage: {
      name: 'Coverage',
      field: 'coverage',
      type: Sq.TEXT,
    },
    inputNg: {
      name: 'InputNg',
      field: 'input_ng',
      type: Sq.TEXT,
    },
    inputUg: {
      name: 'InputUg',
      field: 'input_ug',
      type: Sq.TEXT,
    },
    protocol: {
      name: 'Protocol',
      field: 'protocol',
      type: Sq.TEXT,
    },
    sampleName: {
      name: 'SampleName',
      field: 'sample_name',
      type: Sq.TEXT,
    },
    duplicateReadsPerc: {
      name: 'DuplicateReadsPerc',
      field: 'duplicate_reads_perc',
      type: Sq.TEXT,
    },
  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_seqqc',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  seqQC.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return seqQC;
};
