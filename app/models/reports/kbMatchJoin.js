const {DEFAULT_MAPPING_COLUMNS, DEFAULT_MAPPING_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  return sequelize.define(
    'kbMatchJoin',
    {
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
    },
    {
      ...DEFAULT_MAPPING_OPTIONS,
      tableName: 'reports_kb_match_join',
      scopes: {
        public: {
          attributes: {
            exclude: ['id', 'deletedAt'],
          },
        },
      },
      indexes: [
        {
          name: 'idx_kb_match_id_join',
          fields: ['kb_match_id'],
        },
        {
          name: 'idx_kb_matched_statement_id_join',
          fields: ['kb_matched_statement_id'],
        },
      ],
    },
  );
};
