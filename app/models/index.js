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
    pool: {
      max: dbSettings.poolMax,
      min: dbSettings.poolMin,
      acquire: dbSettings.poolAcquire,
      idle: dbSettings.poolIdle,
    },
  },
);

// Import Application Models
const user = require('./user/user')(sequelize, Sq);
const userMetadata = require('./user/userMetadata')(sequelize, Sq);

user.hasOne(userMetadata, {
  as: 'metadata', foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});
userMetadata.belongsTo(user, {
  as: 'user', foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});

// Projects
const project = require('./project/project')(sequelize, Sq);
const userProject = require('./project/userProject')(sequelize, Sq);
const reportProject = require('./project/reportProject')(sequelize, Sq);

project.belongsToMany(user, {
  as: 'users', through: {model: userProject, unique: false}, foreignKey: 'project_id', otherKey: 'user_id', onDelete: 'CASCADE',
});
user.belongsToMany(project, {
  as: 'projects', through: {model: userProject, unique: false}, foreignKey: 'user_id', otherKey: 'project_id', onDelete: 'CASCADE',
});

// Pog Analysis Reports
const analysisReports = require('./reports/report')(sequelize, Sq);
const reportUsers = require('./reportUser')(sequelize, Sq);

project.belongsToMany(analysisReports, {
  as: 'reports', through: {model: reportProject, unique: false}, foreignKey: 'project_id', otherKey: 'reportId', onDelete: 'CASCADE',
});
analysisReports.belongsToMany(project, {
  as: 'projects', through: {model: reportProject, unique: false}, foreignKey: 'reportId', otherKey: 'project_id', onDelete: 'CASCADE',
});

analysisReports.hasMany(reportUsers, {
  as: 'users', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(reportUsers, {
  as: 'ReportUserFilter', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
reportUsers.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
reportUsers.belongsTo(user, {
  as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL', constraints: true,
});
reportUsers.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

user.belongsToMany(analysisReports, {
  as: 'reports', through: {model: reportUsers, unique: false}, foreignKey: 'user_id', otherKey: 'reportId', onDelete: 'CASCADE',
});

const userGroup = require('./user/userGroup')(sequelize, Sq);
const userGroupMember = require('./user/userGroupMember')(sequelize, Sq);

user.belongsToMany(userGroup, {
  as: 'groups', through: {model: userGroupMember, unique: false}, foreignKey: 'user_id', otherKey: 'group_id', onDelete: 'CASCADE',
});
userGroup.belongsToMany(user, {
  as: 'users', through: {model: userGroupMember, unique: false}, foreignKey: 'group_id', otherKey: 'user_id', onDelete: 'CASCADE',
});

// IMPORTANT must be done before the variant models are defined
const genes = require('./reports/genes')(sequelize, Sq);

genes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(genes, {
  as: 'genes', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const imageData = require('./reports/imageData')(sequelize, Sq);

imageData.belongsTo(analysisReports, {as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE'});

// Patient Information
const patientInformation = require('./reports/patientInformation')(sequelize, Sq);

analysisReports.hasOne(patientInformation, {
  as: 'patientInformation', foreignKey: 'reportId', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});
patientInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});

// Summary
const summary = {};
summary.variantCounts = require('./reports/genomic/summary/variantCounts')(sequelize, Sq);
summary.genomicAlterationsIdentified = require('./reports/genomic/summary/genomicAlterationsIdentified')(sequelize, Sq);
summary.analystComments = require('./reports/genomic/summary/analystComments')(sequelize, Sq);
summary.pathwayAnalysis = require('./reports/genomic/summary/pathwayAnalysis')(sequelize, Sq);
summary.probeResults = require('./reports/probeResults')(sequelize, Sq);
summary.therapeuticTargets = require('./reports/genomic/summary/therapeuticTargets')(sequelize, Sq);
summary.microbial = require('./reports/genomic/summary/microbial')(sequelize, Sq);

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
analysisReports.hasMany(summary.microbial, {
  as: 'microbial', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
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

const smallMutations = require('./reports/smallMutations')(sequelize, Sq);
const mutationSignature = require('./reports/mutationSignature')(sequelize, Sq);
const hlaTypes = require('./reports/hlaTypes')(sequelize, Sq);
const pairwiseExpressionCorrelation = require('./reports/pairwiseExpressionCorrelation')(sequelize, Sq);
const immuneCellTypes = require('./reports/immuneCellTypes')(sequelize, Sq);

smallMutations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
mutationSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
hlaTypes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
pairwiseExpressionCorrelation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
immuneCellTypes.belongsTo(analysisReports, {
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
analysisReports.hasMany(pairwiseExpressionCorrelation, {
  as: 'pairwiseExpressionCorrelation', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(immuneCellTypes, {
  as: 'immuneCellTypes', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// MSI
const msi = require('./reports/msi')(sequelize, Sq);

analysisReports.hasMany(msi, {
  as: 'msi', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
msi.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Signature Variants
const signatureVariants = require('./reports/signatureVariants')(sequelize, Sq);

analysisReports.hasMany(signatureVariants, {
  as: 'signatureVariants', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
signatureVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Tmbur Mutation Burden
const tmburMutationBurden = require('./reports/tmburMutationBurden')(sequelize, Sq);

analysisReports.hasOne(tmburMutationBurden, {
  as: 'tmburMutationBurden', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
tmburMutationBurden.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Copy Number Analysis
const copyVariants = require('./reports/copyVariants')(sequelize, Sq);

copyVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(copyVariants, {
  as: 'copyVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// MAVIS Summary
const mavis = require('./reports/genomic/mavis/mavis')(sequelize, Sq);

mavis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(mavis, {
  as: 'mavis', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Structural Variation
const structuralVariants = require('./reports/structuralVariants')(sequelize, Sq);

structuralVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(structuralVariants, {
  as: 'structuralVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// expression variants
const expressionVariants = require('./reports/expressionVariants')(sequelize, Sq);

expressionVariants.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(expressionVariants, {
  as: 'expressionVariants', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// protein variants
const proteinVariants = require('./reports/proteinVariants')(sequelize, Sq);

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
    attributes: {exclude: ['id', 'reportId', 'deletedAt', 'updatedBy']},
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
const kbMatches = require('./reports/kbMatches')(sequelize, Sq);

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
presentation.discussion = require('./reports/genomic/presentation/discussion.model')(sequelize, Sq);
presentation.slides = require('./reports/genomic/presentation/slides.model')(sequelize, Sq);

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
  as: 'presentationDiscussion', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(presentation.slides, {
  as: 'presentationSlides', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

// Probe Report
const probeTestInformation = require('./reports/probeTestInformation')(sequelize, Sq);

probeTestInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(probeTestInformation, {
  as: 'probeTestInformation', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});

const reportSignatures = require('./reports/signatures')(sequelize, Sq);

reportSignatures.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
reportSignatures.belongsTo(user, {
  as: 'creatorSignature', foreignKey: 'creatorId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
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

// Mutation Burden
const mutationBurden = require('./reports/mutationBurden')(sequelize, Sq);

analysisReports.hasMany(mutationBurden, {
  as: 'mutationBurden', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
mutationBurden.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Comparators
const comparators = require('./reports/comparators')(sequelize, Sq);

analysisReports.hasMany(comparators, {
  as: 'comparators', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
comparators.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Sample Info
const sampleInfo = require('./reports/sampleInfo')(sequelize, Sq);

analysisReports.hasMany(sampleInfo, {
  as: 'sampleInfo', foreignKey: 'reportId', onDelete: 'CASCADE', constraints: true,
});
sampleInfo.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'reportId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Images
const image = require('./image')(sequelize, Sq);

// Template
const template = require('./template/template')(sequelize, Sq);

template.belongsTo(image, {
  as: 'logoImage', foreignKey: 'logoId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
template.belongsTo(image, {
  as: 'headerImage', foreignKey: 'headerId', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

analysisReports.belongsTo(template, {
  as: 'template', foreignKey: 'templateId', targetKey: 'id', onDelete: 'RESTRICT', constraints: true,
});
template.hasMany(analysisReports, {
  as: 'reports', foreignKey: 'templateId', onDelete: 'CASCADE', constraints: true,
});

// Notification (Template optional)
const notification = require('./notification/notification')(sequelize, Sq);

user.hasMany(notification, {
  as: 'notifications', foreignKey: 'userId', onDelete: 'CASCADE', constraints: true,
});
userGroup.hasMany(notification, {
  as: 'notifications', foreignKey: 'userGroupId', onDelete: 'CASCADE', constraints: true,
});
project.hasMany(notification, {
  as: 'notifications', foreignKey: 'projectId', onDelete: 'CASCADE', constraints: true,
});
template.hasMany(notification, {
  as: 'notifications', foreignKey: 'templateId', onDelete: 'CASCADE', constraints: true,
});
notification.belongsTo(template, {
  as: 'template', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
notification.belongsTo(user, {
  as: 'user', foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
notification.belongsTo(project, {
  as: 'project', foreignKey: 'projectId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
notification.belongsTo(userGroup, {
  as: 'userGroup', foreignKey: 'userGroupId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

const notificationTrack = require('./notification/notificationTrack')(sequelize, Sq);

notification.hasMany(notificationTrack, {
  as: 'notifications_tracks', foreignKey: 'notificationId', onDelete: 'CASCADE', constraints: true,
});
notificationTrack.belongsTo(notification, {
  as: 'notifications', foreignKey: 'notificationId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Variant text
const variantText = require('./variantText/variantText')(sequelize, Sq);

template.hasMany(variantText, {
  as: 'variant_texts', foreignKey: 'templateId', onDelete: 'CASCADE', constraints: true,
});
project.hasMany(variantText, {
  as: 'variant_texts', foreignKey: 'projectId', onDelete: 'CASCADE', constraints: true,
});
variantText.belongsTo(template, {
  as: 'template', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
variantText.belongsTo(project, {
  as: 'project', foreignKey: 'projectId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Template Appendix
const templateAppendix = require('./template/templateAppendix')(sequelize, Sq);

template.hasMany(templateAppendix, {
  as: 'appendix', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

templateAppendix.belongsTo(template, {
  as: 'template', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

project.hasMany(templateAppendix, {
  as: 'appendix', foreignKey: 'projectId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

templateAppendix.belongsTo(project, {
  as: 'project', foreignKey: 'projectId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Template Signature Types
const templateSignatureTypes = require('./template/templateSignatureTypes')(sequelize, Sq);

template.hasMany(templateSignatureTypes, {
  as: 'signatureTypes', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

templateSignatureTypes.belongsTo(template, {
  as: 'template', foreignKey: 'templateId', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Germline Small Mutations
require('./germlineSmallMutation')(sequelize, Sq);

module.exports = sequelize;
