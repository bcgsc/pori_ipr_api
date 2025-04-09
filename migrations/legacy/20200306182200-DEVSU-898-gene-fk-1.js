const SV_TABLE = 'reports_structural_variation_sv';
const GENE_TABLE = 'reports_genes';

module.exports = {
  up: async (queryInterface, Sq) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('create the reports_genes table');
      await queryInterface.createTable(
        GENE_TABLE,
        {
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
          reportId: {
            type: Sq.INTEGER,
            unique: false,
            allowNull: false,
            field: 'report_id',
            name: 'reportId',
            references: {
              model: 'reports',
              key: 'id',
            },
          },
          name: {
            type: Sq.TEXT,
            allowNull: false,
          },
          tumourSuppressor: {
            type: Sq.BOOLEAN,
            defaultValue: false,
            field: 'tumour_suppressor',
            name: 'tumourSuppressor',
          },
          oncogene: {
            type: Sq.BOOLEAN,
            defaultValue: false,
          },
          cancerRelated: {
            name: 'cancerRelated',
            field: 'cancer_related',
            type: Sq.BOOLEAN,
            defaultValue: false,
          },
          drugTargetable: {
            name: 'drugTargetable',
            field: 'drug_targetable',
            type: Sq.BOOLEAN,
            defaultValue: false,
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
        },
        {transaction},
      );

      console.log('add the split gene columns to the structural variants table');
      await queryInterface.addColumn(SV_TABLE, 'gene1', Sq.TEXT, {transaction});
      await queryInterface.addColumn(SV_TABLE, 'gene2', Sq.TEXT, {transaction});
      await queryInterface.addColumn(SV_TABLE, 'exon1', Sq.TEXT, {transaction});
      await queryInterface.addColumn(SV_TABLE, 'exon2', Sq.TEXT, {transaction});

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: () => {
    throw Error('Not Implemented');
  },
};
