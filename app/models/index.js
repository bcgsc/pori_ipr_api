const Sq = require('sequelize');
const nconf = require('../config');
const logger = require('../log'); // Load logging library
const {GENE_LINKED_VARIANT_MODELS} = require('../constants');

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

const userToken = sequelize.import('./user/userToken');

user.hasMany(userToken, {as: 'tokens', foreignKey: 'user_id'});
userToken.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id'});

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
  as: 'reports', through: {model: reportProject, unique: false}, foreignKey: 'project_id', otherKey: 'report_id', onDelete: 'CASCADE',
});
analysisReports.belongsToMany(project, {
  as: 'projects', through: {model: reportProject, unique: false}, foreignKey: 'report_id', otherKey: 'project_id', onDelete: 'CASCADE',
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
summary.tumourAnalysis = sequelize.import('./reports/genomic/summary/tumourAnalysis');
summary.mutationSummary = sequelize.import('./reports/genomic/summary/mutationSummary');
summary.variantCounts = sequelize.import('./reports/genomic/summary/variantCounts');
summary.genomicAlterationsIdentified = sequelize.import('./reports/genomic/summary/genomicAlterationsIdentified');
summary.genomicEventsTherapeutic = sequelize.import('./reports/genomic/summary/genomicEventsTherapeutic');
summary.analystComments = sequelize.import('./reports/genomic/summary/analystComments');
summary.pathwayAnalysis = sequelize.import('./reports/genomic/summary/pathwayAnalysis');
summary.probeResults = sequelize.import('./reports/probeResults');
summary.therapeuticTargets = sequelize.import('./reports/genomic/summary/therapeuticTargets');
summary.microbial = sequelize.import('./reports/genomic/summary/microbial');

summary.mutationSummaryv2 = sequelize.import('./reports/genomic/summary/mutationSummary.v02');


analysisReports.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', controlled: true,
});
analysisReports.hasOne(summary.tumourAnalysis, {
  as: 'tumourAnalysis', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(summary.genomicEventsTherapeutic, {
  as: 'genomicEventsTherapeutic', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
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
analysisReports.hasMany(summary.mutationSummaryv2, {
  as: 'mutationSummaryv2', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

summary.genomicEventsTherapeutic.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.mutationSummary.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
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
summary.tumourAnalysis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

summary.mutationSummaryv2.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});


summary.analystComments.belongsTo(user, {
  as: 'authorSignature', foreignKey: 'authorId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
summary.analystComments.belongsTo(user, {
  as: 'reviewerSignature', foreignKey: 'reviewerId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// DetailedGenomicAnalysis
const kbMatches = sequelize.import('./reports/kbMatches');

kbMatches.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(kbMatches, {
  as: 'kbMatches', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const genes = sequelize.import('./reports/genes');
genes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(genes, {
  as: 'genes', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Somatic Mutations
const somaticMutations = {};
somaticMutations.smallMutations = sequelize.import('./reports/genomic/somaticMutations/smallMutations');
somaticMutations.mutationSignature = sequelize.import('./reports/genomic/somaticMutations/mutationSignature');

somaticMutations.smallMutations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
somaticMutations.mutationSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(somaticMutations.smallMutations, {
  as: 'smallMutations', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(somaticMutations.mutationSignature, {
  as: 'mutationSignature', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Copy Number Analysis
const copyNumberAnalyses = {};
copyNumberAnalyses.cnv = sequelize.import('./reports/genomic/copyNumberAnalysis/cnv');

copyNumberAnalyses.cnv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(copyNumberAnalyses.cnv, {
  as: 'cnv', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
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
const structuralVariation = {};
structuralVariation.sv = sequelize.import('./reports/genomic/structuralVariation/sv');

structuralVariation.sv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(structuralVariation.sv, {
  as: 'sv', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});


// expression variants
const expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import('./reports/genomic/expressionAnalysis/outlier');
expressionAnalysis.drugTarget = sequelize.import('./reports/genomic/expressionAnalysis/drugTarget');

expressionAnalysis.outlier.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
expressionAnalysis.drugTarget.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(expressionAnalysis.outlier, {
  as: 'outlier', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(expressionAnalysis.drugTarget, {
  as: 'drugTarget', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});


for (const name of GENE_LINKED_VARIANT_MODELS) {
  const variantModel = sequelize.models[name];
  if (name === 'sv') {
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
  } else {
    // Link variants to the gene model
    variantModel.belongsTo(genes, {
      as: 'gene', foreignKey: 'geneId', onDelete: 'CASCADE', constraints: true,
    });
    genes.hasMany(variantModel, {
      as: name, foreignKey: 'geneId', onDelete: 'CASCADE', constraints: true,
    });
  }
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

const probeSignature = sequelize.import('./reports/probe/signature');
probeSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
probeSignature.belongsTo(user, {
  as: 'readySignature', foreignKey: 'readySignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
probeSignature.belongsTo(user, {
  as: 'reviewerSignature', foreignKey: 'reviewerSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
analysisReports.hasOne(probeSignature, {
  as: 'probe_signature', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Flash Tokens
const flashToken = sequelize.import('./flashtoken.model');
flashToken.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// Germline Small Mutations
require('./germlineSmallMutation')(sequelize);

module.exports = sequelize;
