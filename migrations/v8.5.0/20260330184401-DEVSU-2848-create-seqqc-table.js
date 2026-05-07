const TABLE = 'reports_seqqc';
const {DEFAULT_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create new notifications tables
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.renameColumn('reports', 'seqQC', 'seq_qc', {transaction});
      await queryInterface.createTable(TABLE, {
        ...DEFAULT_COLUMNS,
        reportId: {
          name: 'reportId',
          field: 'report_id',
          type: Sq.INTEGER,
          references: {
            model: 'reports',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          allowNull: false,
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
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
