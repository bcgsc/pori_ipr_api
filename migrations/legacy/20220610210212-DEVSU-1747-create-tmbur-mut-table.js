const {addUniqueActiveFieldIndex} = require('../../migrationTools/index');

const TMBUR_MUTATION_BURDEN = 'reports_tmbur_mutation_burden';
const {DEFAULT_COLUMNS} = require('../../app/models/base');

module.exports = {
  up: (queryInterface, Sq) => {
    // Create table
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove all deleted tmbur entries and create new tmbur_mutation_burden table
      await queryInterface.createTable(TMBUR_MUTATION_BURDEN, {
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
        tumour: {
          type: Sq.STRING,
          defaultValue: null,
        },
        normal: {
          type: Sq.STRING,
          defaultValue: null,
        },
        nonNBasesIn1To22AndXAndY: {
          name: 'nonNBasesIn1To22AndXAndY',
          field: 'non_n_bases_in_1_to_22_and_x_and_y',
          type: Sq.TEXT,
          defaultValue: null,
          jsonSchema: {
            description: 'Non N bases in chromosomes 1 to 22 and X and Y',
          },
        },
        totalGenomeSnvs: {
          name: 'totalGenomeSnvs',
          field: 'total_genome_snvs',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'Total Number of Genome Snvs',
          },
        },
        totalGenomeIndels: {
          name: 'totalGenomeIndels',
          field: 'total_genome_indels',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'Total Number of Genome Indels',
          },
        },
        genomeSnvTmb: {
          name: 'genomeSnvTmb',
          field: 'genome_snv_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'Genome SNV TMB',
          },
        },
        genomeIndelTmb: {
          name: 'genomeIndelTmb',
          field: 'genome_indel_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'Genome Indel TMB',
          },
        },
        cdsBasesIn1To22AndXAndY: {
          name: 'cdsBasesIn1To22AndXAndY',
          field: 'cds_bases_in_1_to_22_and_x_and_y',
          type: Sq.TEXT,
          defaultValue: null,
          jsonSchema: {
            description: 'CDS bases in chromosomes 1 to 22 and X and Y',
          },
        },
        cdsSnvs: {
          name: 'cdsSnvs',
          field: 'cds_snvs',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'CDS Snvs',
          },
        },
        cdsIndels: {
          name: 'cdsIndels',
          field: 'cds_indels',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'CDS Indels',
          },
        },
        cdsSnvTmb: {
          name: 'cdsSnvTmb',
          field: 'cds_snv_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'CDS SNV TMB',
          },
        },
        cdsIndelTmb: {
          name: 'cdsIndelTmb',
          field: 'cds_indel_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'CDS INDEL TMB',
          },
        },
        proteinSnvs: {
          name: 'proteinSnvs',
          field: 'protein_snvs',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'Protein SNVs',
          },
        },
        proteinIndels: {
          name: 'proteinIndels',
          field: 'protein_indels',
          type: Sq.INTEGER,
          defaultValue: null,
          jsonSchema: {
            description: 'Protein Indels',
          },
        },
        proteinSnvTmb: {
          name: 'proteinSnvTmb',
          field: 'protein_snv_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'Protein SNV TMB',
          },
        },
        proteinIndelTmb: {
          name: 'proteinIndelTmb',
          field: 'protein_indel_tmb',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'Protein Indel TMB',
          },
        },
        msiScore: {
          name: 'msiScore',
          field: 'msi_score',
          type: Sq.FLOAT,
          defaultValue: null,
          jsonSchema: {
            description: 'MSI Score',
          },
        },
      }, {transaction});

      // Add unique ident index
      await addUniqueActiveFieldIndex(queryInterface, Sq, transaction, TMBUR_MUTATION_BURDEN, ['ident']);

      // Add not unique report id index
      return queryInterface.addIndex(TMBUR_MUTATION_BURDEN, {
        name: `${TMBUR_MUTATION_BURDEN}_tmbur_report_id_index`,
        fields: ['report_id'],
        unique: false,
        where: {
          deleted_at: {[Sq.Op.eq]: null},
        },
        transaction,
      });
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
