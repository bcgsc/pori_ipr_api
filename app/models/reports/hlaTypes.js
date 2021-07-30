/**
 * This is optitype output data
 * https://pubmed.ncbi.nlm.nih.gov/25143287
 */

const {DEFAULT_COLUMNS, DEFAULT_REPORT_OPTIONS} = require('../base');

module.exports = (sequelize, Sq) => {
  const hlaTypes = sequelize.define('hlaTypes', {
    ...DEFAULT_COLUMNS,
    reportId: {
      name: 'reportId',
      field: 'report_id',
      type: Sq.INTEGER,
      references: {
        model: 'reports',
        key: 'id',
      },
      allowNull: false,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    library: {
      type: Sq.TEXT,
      allowNull: false,
      jsonSchema: {
        description: 'library name of the sample',
      },
    },
    pathology: {
      type: Sq.ENUM(['diseased', 'normal']),
      allowNull: false,
    },
    protocol: {
      type: Sq.ENUM(['DNA', 'RNA']),
      allowNull: false,
    },
    a1: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'first allele for the HLA-A gene. Follows the pattern: A*<group>:<protein>',
      },
    },
    a2: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'second allele for the HLA-A gene. Follows the pattern: A*<group>:<protein>',
      },
    },
    b1: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'first allele for the HLA-B gene. Follows the pattern: B*<group>:<protein>',
      },
    },
    b2: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'second allele for the HLA-B gene. Follows the pattern: B*<group>:<protein>',
      },
    },
    c1: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'first allele for the HLA-C gene. Follows the pattern: C*<group>:<protein>',
      },
    },
    c2: {
      type: Sq.TEXT,
      jsonSchema: {
        description: 'second allele for the HLA-C gene. Follows the pattern: C*<group>:<protein>',
      },
    },
    reads: {
      type: Sq.FLOAT,
      jsonSchema: {
        description: 'number of reads covered by this solution',
      },
    },
    objective: {
      type: Sq.FLOAT,
      jsonSchema: {
        description: 'the value of the linear objective function',
      },
    },

  }, {
    ...DEFAULT_REPORT_OPTIONS,
    tableName: 'reports_hla_types',
    scopes: {
      public: {
        attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
      },
    },
  });

  // set instance methods
  hlaTypes.prototype.view = function (scope) {
    if (scope === 'public') {
      const {
        id, reportId, deletedAt, updatedBy, ...publicView
      } = this.dataValues;
      return publicView;
    }
    return this;
  };

  return hlaTypes;
};
