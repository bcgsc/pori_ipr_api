const {v4: uuidv4} = require('uuid');
const {addUniqueActiveFieldIndex} = require('../migrationTools/index');

const SAMPLE_INFO_TABLE = 'reports_sample_info';

module.exports = {
  async up(queryInterface, Sq) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Migrate (reports) sample info to its own table
      await queryInterface.createTable(SAMPLE_INFO_TABLE, {
        id: {
          type: Sq.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        ident: {
          type: Sq.UUID,
          unique: false,
          defaultValue: Sq.UUIDV4,
          allowNull: false,
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
        updatedBy: {
          name: 'updatedBy',
          field: 'updated_by',
          type: Sq.INTEGER,
          references: {
            model: 'users',
            key: 'id',
          },
        },
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
      }, {transaction});

      // Add unique ident index
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, SAMPLE_INFO_TABLE, ['ident']);
    });

    const reports = await queryInterface.sequelize.query(
      'select distinct * from reports r where deleted_at is null',
      {
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const data = [];

    for (const report of reports) {
      if (report.sampleInfo) {
        for (const sample of report.sampleInfo) {
          data.push({
            ident: uuidv4(),
            created_at: new Date().toLocaleString(),
            updated_at: new Date().toLocaleString(),
            report_id: report.id,
            sample: sample.Sample,
            patho_tc: sample['Patho TC'],
            biopsy_site: sample['Biopsy Site'],
            sample_name: sample['Sample Name'],
            primary_site: sample['Primary Site'],
            collection_date: sample['Collection Date'],
          });
        }
      }
    }

    console.log(`updating ${data.length} rows`);

    if (!data.length === 0) {
      await queryInterface.bulkInsert(SAMPLE_INFO_TABLE, data);
    } else {
      console.log('empty array, skipping migration');
    }
  },

  down: async () => {
    throw new Error('Not Implemented!');
  },
};
