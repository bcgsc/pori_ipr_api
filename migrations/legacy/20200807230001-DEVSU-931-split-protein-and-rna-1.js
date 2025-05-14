const NEW_TABLE = 'reports_protein_variants';

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // create the new table
      await queryInterface.createTable(NEW_TABLE, {
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
        deletedAt: {
          type: Sq.DATE,
          name: 'deletedAt',
          field: 'deleted_at',
        },
        updatedAt: {
          type: Sq.DATE,
          name: 'updatedAt',
          field: 'updated_at',
        },
        ident: {
          type: Sq.UUID,
          unique: false,
          defaultValue: Sq.UUIDV4,
          allowNull: false,
        },
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
        geneId: {
          name: 'geneId',
          field: 'gene_id',
          type: Sq.INTEGER,
          references: {
            model: 'reports_genes',
            key: 'id',
          },
          allowNull: false,
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        percentile: {
          // prev: ptxPerc
          type: Sq.FLOAT,
          defaultValue: null,
        },
        kiqr: {
          // prev: ptxPercKIQR
          type: Sq.FLOAT,
          defaultValue: null,
        },
        qc: {
          // prev: ptxQC
          type: Sq.FLOAT,
          defaultValue: null,
        },
        comparator: {
          // prev: ptxPercCol
          type: Sq.TEXT,
          defaultValue: null,
        },
        totalSampleObserved: {
          // prev: ptxTotSampObs
          name: 'totalSampleObserved',
          field: 'total_sample_observed',
          type: Sq.INTEGER,
          defaultValue: null,
        },
        secondaryPercentile: {
          // prev: ptxPogPerc
          name: 'secondaryPercentile',
          field: 'secondary_percentile',
          type: Sq.FLOAT,
          defaultValue: null,
        },
        secondaryComparator: {
          // new
          name: 'secondaryComparator',
          field: 'secondary_comparator',
          type: Sq.TEXT,
          defaultValue: null,
        },
        kbCategory: {
          name: 'kbCategory',
          field: 'kb_category',
          type: Sq.TEXT,
        },
      }, {transaction});
    });
  },

  down: () => {
    throw new Error('Not implemented!');
  },
};
