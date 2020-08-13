const Sq = require('sequelize');
const nconf = require('../config');
const logger = require('../log'); // Load logging library
const {GENE_LINKED_VARIANT_MODELS, KB_PIVOT_MAPPING, KB_PIVOT_COLUMN} = require('../constants');

// Load database
const dbSettings = nconf.get('database');
logger.info(`setting connection to database ${dbSettings.name}(${dbSettings.hostname}):${dbSettings.port} as ${dbSettings.username}`);
const sequelize = new Sq(
  dbSettings.name,
  dbSettings.username,
  dbSettings.password,
  {
    host: dbSettings.hostname,
    dialect: dbSettings.engine,
    port: dbSettings.port,
    schema: dbSettings.schema,
    logging: null,
  }
);

// Import Application Models
const user = sequelize.import('./user/user');

// Projects
const project = sequelize.import('./project/project');
const userProject = sequelize.import('./project/user_project');
const reportProject = sequelize.import('./project/reportProject');

project.belongsToMany(user, {
  as: 'users', through: {model: userProject, unique: false}, foreignKey: 'project_id', otherKey: 'user_id', onDelete: 'CASCADE',
});
user.belongsToMany(project, {
  as: 'projects', through: {model: userProject, unique: false}, foreignKey: 'user_id', otherKey: 'project_id', onDelete: 'CASCADE',
});

// Pog Analysis Reports
const analysisReports = sequelize.import('./reports/analysis_reports');
const analysisReportsUsers = sequelize.import('./analysis_report_user');

project.belongsToMany(analysisReports, {
  as: 'reports', through: {model: reportProject, unique: false}, foreignKey: 'project_id', otherKey: 'reportId', onDelete: 'CASCADE',
});
analysisReports.belongsToMany(project, {
  as: 'projects', through: {model: reportProject, unique: false}, foreignKey: 'reportId', otherKey: 'project_id', onDelete: 'CASCADE',
});

analysisReports.hasMany(analysisReportsUsers, {
  as: 'users', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(analysisReportsUsers, {
  as: 'ReportUserFilter', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

user.belongsToMany(analysisReports, {
  as: 'reports', through: {model: analysisReportsUsers, unique: false}, foreignKey: 'user_id', otherKey: 'reportId', onDelete: 'CASCADE',
});

const userGroup = sequelize.import('./user/userGroup.js');
const userGroupMember = sequelize.import('./user/userGroupMember.js');
user.belongsToMany(userGroup, {
  as: 'groups', through: {model: userGroupMember, unique: false}, foreignKey: 'user_id', otherKey: 'group_id', onDelete: 'CASCADE',
});
userGroup.belongsToMany(user, {
  as: 'users', through: {model: userGroupMember, unique: false}, foreignKey: 'group_id', otherKey: 'user_id', onDelete: 'CASCADE',
});
userGroup.belongsTo(user, {
  as: 'owner', model: user, foreignKey: 'owner_id', onDelete: 'SET NULL',
});

// IMPORTANT must be done before the variant models are defined
const genes = sequelize.import('./reports/genes');
genes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(genes, {
  as: 'genes', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const imageData = sequelize.import('./reports/imageData');
imageData.belongsTo(analysisReports, {as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE'});

// Patient Information
const patientInformation = sequelize.import('./patientInformation');
analysisReports.hasOne(patientInformation, {
  as: 'patientInformation', foreignKey: 'reportId', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});
patientInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});

// Summary
const summary = {};
summary.variantCounts = sequelize.import('./reports/genomic/summary/variantCounts');
summary.genomicAlterationsIdentified = sequelize.import('./reports/genomic/summary/genomicAlterationsIdentified');
summary.analystComments = sequelize.import('./reports/genomic/summary/analystComments');
summary.pathwayAnalysis = sequelize.import('./reports/genomic/summary/pathwayAnalysis');
summary.probeResults = sequelize.import('./reports/probeResults');
summary.therapeuticTargets = sequelize.import('./reports/genomic/summary/therapeuticTargets');
summary.microbial = sequelize.import('./reports/genomic/summary/microbial');


analysisReports.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', controlled: true,
});
analysisReports.hasOne(summary.variantCounts, {
  as: 'variantCounts', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(summary.genomicAlterationsIdentified, {
  as: 'genomicAlterationsIdentified', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasOne(summary.analystComments, {
  as: 'analystComments', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasOne(summary.pathwayAnalysis, {
  as: 'pathwayAnalysis', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(summary.probeResults, {
  as: 'probeResults', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(summary.therapeuticTargets, {
  as: 'therapeuticTarget', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasOne(summary.microbial, {
  as: 'summary_microbial', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

summary.variantCounts.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.genomicAlterationsIdentified.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.analystComments.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.pathwayAnalysis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.probeResults.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.therapeuticTargets.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.microbial.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Somatic Mutations
const smallMutations = sequelize.import('./reports/smallMutations');
const mutationSignature = sequelize.import('./reports/mutationSignature');
const hlaTypes = sequelize.import('./reports/hlaTypes');

smallMutations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
mutationSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
hlaTypes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(smallMutations, {
  as: 'smallMutations', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(mutationSignature, {
  as: 'mutationSignature', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(hlaTypes, {
  as: 'hlaTypes', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Copy Number Analysis
const copyVariants = sequelize.import('./reports/copyVariants');

copyVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(copyVariants, {
  as: 'copyVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});


// MAVIS Summary
const mavis = sequelize.import('./reports/genomic/mavis/mavis');
mavis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(mavis, {
  as: 'mavis', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Structural Variation
const structuralVariants = sequelize.import('./reports/structuralVariants');

structuralVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(structuralVariants, {
  as: 'structuralVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});


// expression variants
const expressionVariants = sequelize.import('./reports/expressionVariants');

expressionVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(expressionVariants, {
  as: 'expressionVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// protein variants
const proteinVariants = sequelize.import('./reports/proteinVariants');

proteinVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(proteinVariants, {
  as: 'proteinVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});


// This adds the gene to variant relationships to the table which have a foreign key to the genes table
for (const name of GENE_LINKED_VARIANT_MODELS) {
  const variantModel = sequelize.models[name];
  const extendedScope = {
    attributes: {exclude: ['id', 'reportId', 'deletedAt']},
    include: [],
  };

  if (name === 'structuralVariants') {
    // sequelize can't handle union-ing these so they require separate alias names
    variantModel.belongsTo(genes, {
      as: 'gene1', foreignKey: 'gene1Id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
    });
    variantModel.belongsTo(genes, {
      as: 'gene2', foreignKey: 'gene2Id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
    });
    genes.hasMany(variantModel, {
      as: `${name}1`, foreignKey: 'gene1Id', onDelete: 'CASCADE', constraints: true,
    });
    genes.hasMany(variantModel, {
      as: `${name}2`, foreignKey: 'gene2Id', onDelete: 'CASCADE', constraints: true,
    });
    extendedScope.attributes.exclude.push(...['gene1Id', 'gene2Id']);
    extendedScope.include = [
      {
        model: sequelize.models.genes.scope('minimal'),
        foreignKey: 'gene1Id',
        as: 'gene1',
        include: [],
      },
      {
        model: sequelize.models.genes.scope('minimal'),
        foreignKey: 'gene2Id',
        as: 'gene2',
        include: [],
      },
    ];
  } else {
    // Link variants to the gene model
    variantModel.belongsTo(genes, {
      as: 'gene', foreignKey: 'geneId', onDelete: 'CASCADE', constraints: true,
    });
    if (['expressionVariants', 'copyVariants'].includes(name)) {
      genes.hasOne(variantModel, {
        as: name, foreignKey: 'geneId', onDelete: 'CASCADE', constraints: true,
      });
    } else {
      genes.hasMany(variantModel, {
        as: name, foreignKey: 'geneId', onDelete: 'CASCADE', constraints: true,
      });
    }
    extendedScope.attributes.exclude.push(...['geneId']);
    extendedScope.include = [
      {
        model: sequelize.models.genes.scope('minimal'),
        foreignKey: 'geneId',
        as: 'gene',
        include: [],
      },
    ];
  }

  // add the linked scope
  for (const link of ['expressionVariants', 'copyVariants']) {
    if (link !== name) {
      extendedScope.include.forEach((geneInclude) => {
        geneInclude.include.push({
          model: sequelize.models[link].scope('minimal'),
          foreignKey: 'geneId',
          as: link,
        });
      });
    }
  }
  variantModel.addScope('extended', extendedScope);
}

// IMPORTANT: Must be defined after variant models so that the includes can be found
const kbMatches = sequelize.import('./reports/kbMatches');

kbMatches.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(kbMatches, {
  as: 'kbMatches', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

for (const [pivotValue, modelName] of Object.entries(KB_PIVOT_MAPPING)) {
  sequelize.models[modelName].hasMany(kbMatches, {
    foreignKey: 'variantId',
    constraints: false,
    scope: {
      [KB_PIVOT_COLUMN]: pivotValue,
    },
  });
  kbMatches.belongsTo(sequelize.models[modelName], {
    foreignKey: 'variantId',
    constraints: false,
    as: modelName,
  });
}

// Presentation Data
const presentation = {};
presentation.discussion = sequelize.import('./reports/genomic/presentation/discussion.model');
presentation.slides = sequelize.import('./reports/genomic/presentation/slides.model');
presentation.discussion.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
presentation.slides.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
presentation.slides.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
presentation.discussion.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
analysisReports.hasMany(presentation.discussion, {
  as: 'presentation_discussion', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(presentation.slides, {
  as: 'presentation_slides', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Probe Report
const probeTestInformation = sequelize.import('./reports/probe/test_information');
probeTestInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(probeTestInformation, {
  as: 'probe_test_information', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const reportSignatures = sequelize.import('./reports/signatures');
reportSignatures.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
reportSignatures.belongsTo(user, {
  as: 'authorSignature', foreignKey: 'authorId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
reportSignatures.belongsTo(user, {
  as: 'reviewerSignature', foreignKey: 'reviewerId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
analysisReports.hasOne(reportSignatures, {
  as: 'signatures', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const mutationBurden = sequelize.import('./reports/mutationBurden');
analysisReports.hasMany(mutationBurden, {
  as: 'mutationBurden', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
mutationBurden.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

const comparators = sequelize.import('./reports/comparators');
analysisReports.hasMany(comparators, {
  as: 'comparators', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
comparators.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Germline Small Mutations
require('./germlineSmallMutation')(sequelize);

module.exports = sequelize;
