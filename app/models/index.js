const Sq = require('sequelize');
const colors = require('colors');
const bcrypt = require('bcryptjs');
const nconf = require('../config');
const logger = require('../log'); // Load logging library

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

// POG
const POG = sequelize.import('./POG');

// Projects
const project = sequelize.import('./project/project');
const userProject = sequelize.import('./project/user_project');
const pogProject = sequelize.import('./project/pog_project');

project.belongsToMany(POG, {
  as: 'pogs', through: {model: pogProject, unique: false}, foreignKey: 'project_id', otherKey: 'pog_id', onDelete: 'CASCADE',
});
POG.belongsToMany(project, {
  as: 'projects', through: {model: pogProject, unique: false}, foreignKey: 'pog_id', otherKey: 'project_id', onDelete: 'CASCADE',
});

project.belongsToMany(user, {
  as: 'users', through: {model: userProject, unique: false}, foreignKey: 'project_id', otherKey: 'user_id', onDelete: 'CASCADE',
});
user.belongsToMany(project, {
  as: 'projects', through: {model: userProject, unique: false}, foreignKey: 'user_id', otherKey: 'project_id', onDelete: 'CASCADE',
});

// Analysis
const analysis = require('../modules/analysis/models')(sequelize);

POG.hasMany(sequelize.models.pog_analysis, {as: 'analysis', foreignKey: 'pog_id', onDelete: 'CASCADE'});

// Pog Analysis Reports
const analysisReports = sequelize.import('./reports/analysis_reports');
const analysisReportsUsers = sequelize.import('./analysis_report_user');

POG.hasMany(analysisReports, {as: 'analysis_reports', foreignKey: 'pog_id', onDelete: 'CASCADE'});

analysisReports.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', onDelete: 'CASCADE'});
analysisReports.belongsTo(sequelize.models.pog_analysis, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE'});
sequelize.models.pog_analysis.hasMany(analysisReports, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE'});

analysisReports.hasMany(analysisReportsUsers, {
  as: 'users', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(analysisReportsUsers, {
  as: 'ReportUserFilter', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

user.belongsToMany(analysisReports, {
  as: 'reports', through: {model: analysisReportsUsers, unique: false}, foreignKey: 'user_id', otherKey: 'pog_report_id', onDelete: 'CASCADE',
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
imageData.belongsTo(analysisReports, {as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE'});

// Patient Information
const patientInformation = sequelize.import('./patientInformation');
analysisReports.hasOne(patientInformation, {
  as: 'patientInformation', foreignKey: 'pog_report_id', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
});
patientInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE', onUpdate: 'CASCADE', constraints: true,
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
summary.probeTarget = sequelize.import('./reports/genomic/summary/probeTarget');
summary.therapeuticTargets = sequelize.import('./reports/genomic/summary/therapeuticTargets');
summary.microbial = sequelize.import('./reports/genomic/summary/microbial');

summary.mutationSummaryv2 = sequelize.import('./reports/genomic/summary/mutationSummary.v02');

POG.hasMany(summary.therapeuticTargets, {
  as: 'therapeuticTargets', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true,
});

POG.hasOne(patientInformation, {
  as: 'patientInformation', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', controlled: true,
});
analysisReports.hasOne(summary.tumourAnalysis, {
  as: 'tumourAnalysis', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true,
});

summary.genomicEventsTherapeutic.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.mutationSummary.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.variantCounts.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.genomicAlterationsIdentified.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.analystComments.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.pathwayAnalysis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.probeTarget.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.microbial.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
summary.tumourAnalysis.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

summary.mutationSummaryv2.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});


summary.analystComments.belongsTo(user, {
  as: 'authorSignature', foreignKey: 'authorSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
summary.analystComments.belongsTo(user, {
  as: 'reviewerSignature', foreignKey: 'reviewerSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// DetailedGenomicAnalysis
const alterations = sequelize.import('./reports/genomic/detailedGenomicAnalysis/alterations');
const targetedGenes = sequelize.import('./reports/genomic/detailedGenomicAnalysis/targetedGenes');

alterations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
targetedGenes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Somatic Mutations
const somaticMutations = {};
somaticMutations.smallMutations = sequelize.import('./reports/genomic/somaticMutations/smallMutations');
somaticMutations.mutationSignature = sequelize.import('./reports/genomic/somaticMutations/mutationSignature');

somaticMutations.smallMutations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
somaticMutations.mutationSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Copy Number Analysis
const copyNumberAnalyses = {};
copyNumberAnalyses.cnv = sequelize.import('./reports/genomic/copyNumberAnalysis/cnv');
copyNumberAnalyses.cnv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// MAVIS Summary
sequelize.import('./reports/genomic/mavis/mavis');

// Structural Variation
const structuralVariation = {};
structuralVariation.sv = sequelize.import('./reports/genomic/structuralVariation/sv');

structuralVariation.sv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Structural Variation
const expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import('./reports/genomic/expressionAnalysis/outlier');
// expressionAnalysis.proteinExpression = sequelize.import(__dirname + '/reports/genomic/expressionAnalysis/proteinExpression');
expressionAnalysis.drugTarget = sequelize.import('./reports/genomic/expressionAnalysis/drugTarget');

expressionAnalysis.outlier.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
expressionAnalysis.drugTarget.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Presentation Data
const presentation = {};
presentation.discussion = sequelize.import('./reports/genomic/presentation/discussion.model');
presentation.slides = sequelize.import('./reports/genomic/presentation/slides.model');
presentation.discussion.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
presentation.slides.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
presentation.slides.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
presentation.discussion.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// Data Export
const POGDataExport = sequelize.import('./POGDataExport');
POGDataExport.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
POGDataExport.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// Knowledgebase
const kb = {};
kb.references = sequelize.import('./knowledgebase/kb_references');
kb.references.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
kb.references.belongsTo(user, {
  as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

kb.events = sequelize.import('./knowledgebase/kb_events');
kb.events.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
kb.events.belongsTo(user, {
  as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

kb.history = sequelize.import('./knowledgebase/kb_history');
kb.history.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
user.hasMany(kb.history, {
  as: 'kbedits', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true,
});

// Probe Report
const probeTestInformation = sequelize.import('./reports/probe/test_information');
probeTestInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
probeTestInformation.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

const probeSignature = sequelize.import('./reports/probe/signature');
probeSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
probeSignature.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
probeSignature.belongsTo(user, {
  as: 'readySignature', foreignKey: 'readySignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
probeSignature.belongsTo(user, {
  as: 'reviewerSignature', foreignKey: 'reviewerSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// Load Tracking Models
const trackingModels = require('../modules/tracking/models')(sequelize);

// Subscription
const subscription = sequelize.import('./pog_analysis_subscription');
subscription.belongsTo(sequelize.models.pog_analysis, {
  as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE', constraints: true,
});
subscription.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// Flash Tokens
const flashToken = sequelize.import('./flashtoken.model');
flashToken.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// Notifications
const notification = require('../modules/notification/models')(sequelize);

// Germline Small Mutations
const gsm = require('../modules/germine_small_mutation/models')(sequelize);

// Syncronize tables to model schemas
if (nconf.get('database:migrate') && nconf.get('database:hardMigrate')) {
  // If we're in production mode STOP!!
  if (nconf.get('env') === 'production') {
    console.log(colors.red('!!!! Hard Migration not supported in production mode !!!!'));
    process.exit();
  }
  sequelize.sync(
    {
      force: true,
      schema: nconf.get('database:schema'),
    }
  ).then(
    async (res) => {
      console.log(colors.dim('[DB] ') + colors.bgGreen('Finished syncing'));

      try {
        // Insert Admin User
        await user.create({
          username: 'admin', password: bcrypt.hashSync('AdminMaster', 10), firstName: 'Admin', lastName: 'User', email: 'iprAdmin@bcgsc.ca', access: 'superUser',
        });
        console.log(colors.dim('[DB] ') + colors.bgGreen('Admin user created.'));
        await userGroup.bulkCreate([
          {name: 'superUser', owner_id: 1},
          {name: 'admin', owner_id: 1},
          {name: 'analyst', owner_id: 1},
          {name: 'bioinformatician', owner_id: 1},
          {name: 'clinician', owner_id: 1},
        ]);
      } catch (error) {
        console.log(colors.dim('[DB] ') + colors.bgRed('Unable to create admin user.'));
        console.error(error);
      }
    },
    (error) => {
      console.error(error);
      console.log(colors.dim('[DB] ') + colors.bgRed('Unable to sync database'));
    }
  );
  console.log('!!! Wiping existing database structure and rebuilding from model schemas'.white.bgRed);
}

if (nconf.get('database:migrate') && !nconf.get('database:hardMigrate')) {
  sequelize.sync({schema: nconf.get('database:schema')});
  console.log('Updating database to match current model schemas'.white.bgRed);
}

module.exports = sequelize;
