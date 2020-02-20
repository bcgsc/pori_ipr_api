const Sq = require('sequelize');

const REPORT_TABLE_NAME = 'pog_analysis_germline_small_mutations';
const MAPPING_TABLE = 'germline_reports_to_projects';

const NEW_TABLE_COLUMNS = {
  id: {
    type: Sq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  createdAt: {
    type: Sq.DATE,
    defaultValue: Sq.NOW,
    name: 'createdAt',
    field: 'created_at',
  },
  updatedAt: {
    type: Sq.DATE,
    name: 'updatedAt',
    field: 'updated_at',
  },
  deletedAt: {
    type: Sq.DATE,
    name: 'deletedAt',
    field: 'deleted_at',
  },
  germlineReportId: {
    field: 'germline_report_id',
    name: 'germlineReportId',
    type: Sq.INTEGER,
    unique: false,
    allowNull: false,
    references: {
      model: REPORT_TABLE_NAME,
      key: 'id',
    },
  },
  projectId: {
    field: 'project_id',
    name: 'projectId',
    type: Sq.INTEGER,
    unique: false,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
};


module.exports = {
  up: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // add the new columns patientId and biopsyName
      console.log(`Add new new column ${REPORT_TABLE_NAME}.patient_id`);
      await queryInterface.addColumn(
        REPORT_TABLE_NAME,
        'patient_id',
        {type: Sq.TEXT},
        {transaction}
      );
      console.log(`Add new new column ${REPORT_TABLE_NAME}.biopsy_name`);
      await queryInterface.addColumn(
        REPORT_TABLE_NAME,
        'biopsy_name',
        {type: Sq.TEXT},
        {transaction}
      );

      console.log('copy the patientId and biopsyName from the analysis');
      await queryInterface.sequelize.query(
        `UPDATE ${REPORT_TABLE_NAME} as gsm SET (
          patient_id,
          biopsy_name
        ) = (
          SELECT pogs."POGID" as patient_id, pa.analysis_biopsy as biopsy_name
          FROM pog_analysis pa
          JOIN "POGs" pogs on (pogs.id = pa.pog_id)
          WHERE pa.id = gsm.pog_analysis_id
        )`, {transaction}
      );

      console.log('add the not null contraints to the new patient_id column');
      await queryInterface.changeColumn(
        REPORT_TABLE_NAME,
        'patient_id',
        {
          allowNull: false, type: Sq.TEXT,
        },
        {transaction}
      );

      console.log('create the new project mapping table');
      await queryInterface.createTable(
        MAPPING_TABLE,
        NEW_TABLE_COLUMNS,
        {transaction},
      );
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw new Error('Not Implemented');
  },
};
