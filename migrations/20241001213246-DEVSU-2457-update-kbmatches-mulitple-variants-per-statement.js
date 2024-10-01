const KB_MATCHED_STATEMENTS = 'kb_matched_statements';
const KB_MATCH_JOIN = 'kb_match_join';
const KB_MATCHES = 'kb_matches';
const KB_MATCHES_OLD = 'kb_matches_old';
const {DEFAULT_COLUMNS, DEFAULT_MAPPING_COLUMNS} = require('../app/models/base');
const {KB_PIVOT_COLUMN, KB_PIVOT_MAPPING} = require('../app/constants');

module.exports = {
  up: (queryInterface, Sq) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Duplicate old kb matches table to kb matches table old
      await queryInterface.renameTable(
        KB_MATCHES_OLD,
        KB_MATCHES,
        {transaction},
      );

      // Create new Kb Matches table with only necessary columns
      await queryInterface.createTable(KB_MATCHES, {
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
        kbVariant: {
          name: 'kbVariant',
          field: 'kb_variant',
          type: Sq.TEXT,
        },
        variantType: {
          name: KB_PIVOT_COLUMN,
          field: 'variant_type',
          type: Sq.ENUM(...Object.keys(KB_PIVOT_MAPPING)),
          allowNull: false,
        },
        variantId: {
          name: 'variantId',
          field: 'variant_id',
          type: Sq.INTEGER,
          allowNull: false,
        },
        kbVariantId: {
          name: 'kbVariantId',
          field: 'kb_variant_id',
          type: Sq.TEXT,
        },
      });

      // Create new Kb Matched Statements table
      await queryInterface.createTable(KB_MATCHED_STATEMENTS, {
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
        category: {
          type: Sq.ENUM(
            'therapeutic',
            'prognostic',
            'diagnostic',
            'biological',
            'unknown',
            'novel',
            'pharmacogenomic',
            'cancer predisposition',
          ),
          allowNull: false,
        },
        approvedTherapy: {
          name: 'approvedTherapy',
          field: 'approved_therapy',
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        disease: {
          type: Sq.TEXT,
        },
        relevance: {
          type: Sq.TEXT,
        },
        context: {
          type: Sq.TEXT,
        },
        status: {
          type: Sq.TEXT,
        },
        reference: {
          type: Sq.TEXT,
        },
        sample: {
          type: Sq.TEXT,
        },
        evidenceLevel: {
          name: 'evidenceLevel',
          field: 'evidence_level',
          type: Sq.TEXT,
        },
        iprEvidenceLevel: {
          name: 'iprEvidenceLevel',
          field: 'ipr_evidence_level',
          type: Sq.TEXT,
          defaultValue: null,
        },
        matchedCancer: {
          name: 'matchedCancer',
          field: 'matched_cancer',
          type: Sq.BOOLEAN,
          defaultValue: false,
          allowNull: false,
        },
        pmidRef: {
          name: 'pmidRef',
          field: 'pmid_ref',
          type: Sq.TEXT,
        },
        kbStatementId: {
          name: 'kbStatementId',
          field: 'kb_statement_id',
          type: Sq.TEXT,
        },
        kbData: {
          name: 'kbData',
          field: 'kb_data',
          type: Sq.JSONB,
          jsonSchema: {
            schema: {
              type: 'object',
              example: {inferred: true},
            },
          },
        },
        externalSource: {
          name: 'externalSource',
          field: 'external_source',
          type: Sq.TEXT,
        },
        externalStatementId: {
          name: 'externalStatementId',
          field: 'external_statement_id',
          type: Sq.TEXT,
        },
        reviewStatus: {
          name: 'reviewStatus',
          field: 'review_status',
          type: Sq.TEXT,
        },
        kbMatchId: {
          name: 'kbMatchId',
          field: 'kb_match_id',
          type: Sq.INTEGER,
        },
      }, {transaction});

      // Create new Kb Match Join table
      await queryInterface.createTable(KB_MATCH_JOIN, {
        ...DEFAULT_MAPPING_COLUMNS,
        kbMatchId: {
          name: 'kbMatchId',
          field: 'kb_match_id',
          type: Sq.INTEGER,
          unique: false,
          allowNull: false,
          references: {
            model: 'kbMatches',
            key: 'id',
          },
        },
        kbMatchedStatementId: {
          name: 'kbMatchedStatementId',
          field: 'kb_matched_statement_id',
          type: Sq.INTEGER,
          unique: false,
          allowNull: false,
          references: {
            model: 'kbMatchedStatements',
            key: 'id',
          },
        },
      });

      // Migrate data from old Kb Matches to new Kb Matches
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into kb_matches
        (ident, id, created_at, updated_at, deleted_at, updated_by, 
          report_id, kb_variant, variant_type, variant_id, kb_variant_id)
        select ident, id, created_at, updated_at, deleted_at, updated_by, report_id, 
          kb_variant, variant_type, variant_id, kb_variant_id 
        from kb_matches_old;`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        },
      );

      // Migrate data from old Kb Matches to new Kb Matched Statements
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into kb_matched_statements
        (ident, created_at, updated_at, 
          report_id, category, approved_therapy, disease, relevance, context, status, reference, 
          sample, evidence_level, ipr_evidence_level, matched_cancer, pmid_ref, kb_statement_id, 
          kb_data, external_source, external_statement_id, review_status, kb_match_id)
        select gen_random_uuid(), now(), now(), 
          report_id, category, approved_therapy, disease, relevance, context, status, reference, 
          sample, evidence_level, ipr_evidence_level, matched_cancer, pmid_ref, kb_statement_id, 
          kb_data, external_source, external_statement_id, review_status, id
        from kb_matches_old;`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        },
      );

      // Migrate data from old Kb Matches to new Kb Matches
      await queryInterface.sequelize.query(
        // eslint-disable-next-line no-multi-str
        `insert into kb_match_join
        (kb_matched_statement_id, kb_match_id, created_at, updated_at)
        select id, kb_match_id, now(), now()
        from kb_matched_statements;`,
        {
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction,
        },
      );

      // Remove temporary kb_match_id column from kb_matches_statements
      await queryInterface.removeColumn(KB_MATCHED_STATEMENTS, 'kb_match_id', {transaction});
    });
  },

  down: () => {
    throw new Error('Not Implemented!');
  },
};
