const Sq = require('sequelize');
const nconf = require('nconf').argv().env().file({file: `${process.cwd()}/config/config.json`});
const colors = require('colors');
const bcrypt = require('bcryptjs');
const logger = require('../../lib/log');

let CONFIG = {};

if (process.env.NODE_ENV === 'production') {
  CONFIG = require('/var/www/ipr/api/production/persist/.env.json');
}
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'local') {
  try {
    // iprweb01 dev
    CONFIG = require(`/var/www/ipr/api/${process.env.NODE_ENV}/persist/.env.json`)[process.env.NODE_ENV];
  } catch (e) {
    logger.info('!! DB Config not found - attempting to load local dev .env.json file');
    // Probably running on local dev
    const configs = require(`${process.cwd()}/.env.json`);
    CONFIG = configs[process.env.NODE_ENV];
  }
}

// Load database
const dbSettings = CONFIG.database[CONFIG.database.engine];
const sequelize = new Sq(dbSettings.database, dbSettings.username, dbSettings.password, {
  host: dbSettings.hostname,
  dialect: CONFIG.database.engine,
  port: dbSettings.port,
  schema: dbSettings.schema,
  logging: null,
});

// Import Application Models

// let dataHistory = sequelize.import(__dirname + '/dataHistory');
const user = sequelize.import(`${__dirname}/user/user`);

const userToken = sequelize.import(`${__dirname}/user/userToken`);
user.hasMany(userToken, {as: 'tokens', foreignKey: 'user_id'});
userToken.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id'});

// Change History
const changeHistory = sequelize.import(`${__dirname}/change_history`);
user.hasMany(changeHistory, {as: 'user', foreignKey: 'user_id'});

// POG
const POG = sequelize.import(`${__dirname}/POG`);

// Projects
const project = sequelize.import(`${__dirname}/project/project`);
const userProject = sequelize.import(`${__dirname}/project/user_project`);
const pogProject = sequelize.import(`${__dirname}/project/pog_project`);

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
require('../modules/analysis/models')(sequelize);

POG.hasMany(sequelize.models.pog_analysis, {as: 'analysis', foreignKey: 'pog_id', onDelete: 'CASCADE'});

// Pog Analysis Reports
const analysisReports = sequelize.import(`${__dirname}/reports/analysis_reports`);
const analysisReportsUsers = sequelize.import(`${__dirname}/analysis_report_user`);

POG.hasMany(analysisReports, {as: 'analysis_reports', foreignKey: 'pog_id', onDelete: 'CASCADE'});

analysisReports.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', onDelete: 'CASCADE'});
analysisReports.belongsTo(sequelize.models.pog_analysis, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE'});
sequelize.models.pog_analysis.hasMany(analysisReports, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE'});

analysisReports.hasMany(analysisReportsUsers, {
  as: 'users', foreignKey: 'report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.hasMany(analysisReportsUsers, {
  as: 'ReportUserFilter', foreignKey: 'report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'report_id', onDelete: 'CASCADE', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL', constraints: true,
});
analysisReportsUsers.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// analysis_reports.belongsToMany(user, {as: 'users', through: {model: analysis_reports_users, unique: false }, foreignKey: 'report_id', otherKey: 'user_id', onDelete: 'CASCADE'});
user.belongsToMany(analysisReports, {
  as: 'reports', through: {model: analysisReportsUsers, unique: false}, foreignKey: 'user_id', otherKey: 'report_id', onDelete: 'CASCADE',
});

const userGroup = sequelize.import(`${__dirname}/user/userGroup.js`);
const userGroupMember = sequelize.import(`${__dirname}/user/userGroupMember.js`);
user.belongsToMany(userGroup, {
  as: 'groups', through: {model: userGroupMember, unique: false}, foreignKey: 'user_id', otherKey: 'group_id', onDelete: 'CASCADE',
});
userGroup.belongsToMany(user, {
  as: 'users', through: {model: userGroupMember, unique: false}, foreignKey: 'group_id', otherKey: 'user_id', onDelete: 'CASCADE',
});
userGroup.belongsTo(user, {
  as: 'owner', model: user, foreignKey: 'owner_id', onDelete: 'SET NULL',
});

const imageData = sequelize.import(`${__dirname}/reports/imageData`);
imageData.belongsTo(analysisReports, {as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE'});

// Patient Information
const patientInformation = sequelize.import(`${__dirname}/patientInformation`);

// Summary
const summary = {};
summary.tumourAnalysis = sequelize.import(`${__dirname}/reports/genomic/summary/tumourAnalysis`);
summary.mutationSummary = sequelize.import(`${__dirname}/reports/genomic/summary/mutationSummary`);
summary.variantCounts = sequelize.import(`${__dirname}/reports/genomic/summary/variantCounts`);
summary.genomicAlterationsIdentified = sequelize.import(`${__dirname}/reports/genomic/summary/genomicAlterationsIdentified`);
summary.genomicEventsTherapeutic = sequelize.import(`${__dirname}/reports/genomic/summary/genomicEventsTherapeutic`);
summary.analystComments = sequelize.import(`${__dirname}/reports/genomic/summary/analystComments`);
summary.pathwayAnalysis = sequelize.import(`${__dirname}/reports/genomic/summary/pathwayAnalysis`);
summary.probeTarget = sequelize.import(`${__dirname}/reports/genomic/summary/probeTarget`);
summary.therapeuticTargets = sequelize.import(`${__dirname}/reports/genomic/summary/therapeuticTargets`);
summary.microbial = sequelize.import(`${__dirname}/reports/genomic/summary/microbial`);

summary.mutationSummaryv2 = sequelize.import(`${__dirname}/reports/genomic/summary/mutationSummary.v02`);

POG.hasMany(summary.therapeuticTargets, {
  as: 'therapeuticTargets', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true,
});

POG.hasOne(patientInformation, {
  as: 'patientInformation', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true,
});
analysisReports.belongsTo(patientInformation, {as: 'patientInformation', foreignKey: 'pog_id', targetKey: 'pog_id'});
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
summary.genomicEventsTherapeutic.belongsTo(analysisReports, {
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
const alterations = sequelize.import(`${__dirname}/reports/genomic/detailedGenomicAnalysis/alterations`);
const targetedGenes = sequelize.import(`${__dirname}/reports/genomic/detailedGenomicAnalysis/targetedGenes`);

alterations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
targetedGenes.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Somatic Mutations
const somaticMutations = {};
somaticMutations.smallMutations = sequelize.import(`${__dirname}/reports/genomic/somaticMutations/smallMutations`);
somaticMutations.mutationSignature = sequelize.import(`${__dirname}/reports/genomic/somaticMutations/mutationSignature`);

somaticMutations.smallMutations.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
somaticMutations.mutationSignature.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Copy Number Analysis
const copyNumberAnalyses = {};
copyNumberAnalyses.cnv = sequelize.import(`${__dirname}/reports/genomic/copyNumberAnalysis/cnv`);
copyNumberAnalyses.cnv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// MAVIS Summary
sequelize.import(`${__dirname}/reports/genomic/mavis/mavis`);

// Structural Variation
const structuralVariation = {};
structuralVariation.sv = sequelize.import(`${__dirname}/reports/genomic/structuralVariation/sv`);

structuralVariation.sv.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Structural Variation
const expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import(`${__dirname}/reports/genomic/expressionAnalysis/outlier`);
// expressionAnalysis.proteinExpression = sequelize.import(__dirname + '/reports/genomic/expressionAnalysis/proteinExpression');
expressionAnalysis.drugTarget = sequelize.import(`${__dirname}/reports/genomic/expressionAnalysis/drugTarget`);

expressionAnalysis.outlier.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
expressionAnalysis.drugTarget.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

// Presentation Data
const presentation = {};
presentation.discussion = sequelize.import(`${__dirname}/reports/genomic/presentation/discussion.model`);
presentation.slides = sequelize.import(`${__dirname}/reports/genomic/presentation/slides.model`);
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


// Report Change History

const reportChangeHistory = sequelize.import(`${__dirname}/reports/report_change_history`);

// this is set up as a many-to-many relationship due to sequelize constraints but it should be noted that each change history item can only belong to one report
// this is enforced by making the FK reference to the change_history table in report_change_history a unique key.
analysisReports.belongsToMany(changeHistory, {
  as: 'change_history', through: {model: reportChangeHistory}, foreignKey: 'report_id', otherKey: 'change_history_id', onDelete: 'CASCADE',
});
changeHistory.belongsToMany(analysisReports, {
  as: 'report', through: {model: reportChangeHistory}, foreignKey: 'change_history_id', otherKey: 'report_id', onDelete: 'CASCADE',
});

// Data History
const POGDataHistory = sequelize.import(`${__dirname}/POGDataHistory`);
const POGDataHistoryTag = sequelize.import(`${__dirname}/POGDataHistoryTag`);
POGDataHistory.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
POGDataHistory.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
POG.hasMany(POGDataHistory, {
  as: 'dataHistory', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true,
});

POGDataHistory.hasMany(POGDataHistoryTag, {
  as: 'tags', foreignKey: 'history_id', onDelete: 'CASCADE', constraints: true,
});
POGDataHistoryTag.belongsTo(POGDataHistory, {
  as: 'history', foreignKey: 'history_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
POGDataHistoryTag.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
user.hasMany(POGDataHistory, {
  as: 'edits', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true,
});

// Data Export
const POGDataExport = sequelize.import(`${__dirname}/POGDataExport`);
POGDataExport.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
POGDataExport.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

// Knowledgebase
const kb = {};
kb.references = sequelize.import(`${__dirname}/knowledgebase/kb_references`);
kb.references.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
kb.references.belongsTo(user, {
  as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

kb.events = sequelize.import(`${__dirname}/knowledgebase/kb_events`);
kb.events.belongsTo(user, {
  as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
kb.events.belongsTo(user, {
  as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});

kb.history = sequelize.import(`${__dirname}/knowledgebase/kb_history`);
kb.history.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true,
});
user.hasMany(kb.history, {
  as: 'kbedits', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true,
});

// Probe Report
const probeTestInformation = sequelize.import(`${__dirname}/reports/probe/test_information`);
probeTestInformation.belongsTo(analysisReports, {
  as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});
probeTestInformation.belongsTo(POG, {
  as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true,
});

const probeSignature = sequelize.import(`${__dirname}/reports/probe/signature`);
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
require('../modules/tracking/models')(sequelize);

// Subscription
const subscription = sequelize.import(`${__dirname}/pog_analysis_subscription`);
subscription.belongsTo(sequelize.models.pog_analysis, {
  as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE', constraints: true,
});
subscription.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// Flash Tokens
const flashToken = sequelize.import(`${__dirname}/flashtoken.model`);
flashToken.belongsTo(user, {
  as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true,
});

// Notifications
require('../modules/notification/models')(sequelize);

// Germline Small Mutations
require('../modules/germine_small_mutation/models')(sequelize);


// Syncronize tables to model schemas
if (nconf.get('database:migrate') && nconf.get('database:hardMigrate')) {
  // If we're in production mode STOP!!
  if (nconf.get('env') === 'production') {
    logger.info(colors.red('!!!! Hard Migration not supported in production mode !!!!'));
    process.exit();
  }

  sequelize.sync(
    {
      force: true,
      schema: nconf.get('database:postgres:schema'),
    }
  ).then(
    () => {
      logger.info(colors.dim('[DB] ') + colors.bgGreen('Finished syncing'));


      // Insert Admin User
      user.create({
        username: 'admin', password: bcrypt.hashSync('AdminMaster', 10), firstName: 'Admin', lastName: 'User', email: 'iprAdmin@bcgsc.ca', access: 'superUser',
      }).then(
        () => {
          logger.info(colors.dim('[DB] ') + colors.bgGreen('Admin user created.'));

          userGroup.bulkCreate([
            {name: 'superUser', owner_id: 1},
            {name: 'admin', owner_id: 1},
            {name: 'analyst', owner_id: 1},
            {name: 'bioinformatician', owner_id: 1},
            {name: 'clinician', owner_id: 1},
          ]);
        },
        (error) => {
          logger.info(colors.dim('[DB] ') + colors.bgRed('Unable to create admin user.'));
          logger.info(error);
        }
      );
    },
    (err) => {
      logger.info(err);
      logger.info(colors.dim('[DB] ') + colors.bgRed('Unable to sync database'));
    }
  );
  logger.info('!!! Wiping existing database structure and rebuilding from model schemas'.white.bgRed);
}
if (nconf.get('database:migrate') && !nconf.get('database:hardMigrate')) {
  sequelize.sync({schema: nconf.get('database:postgres:schema')});
  logger.info('Updating database to match current model schemas'.white.bgRed);
}

module.exports = sequelize;
