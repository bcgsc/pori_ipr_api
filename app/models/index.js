"use strict";
let Sq = require('sequelize');
let path = require('path');
let nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
let colors = require('colors');

const CONFIG = require( process.cwd() + '/config/'+process.env.NODE_ENV+'.json');

// Load database
const dbSettings = CONFIG.database[CONFIG.database.engine];
let sequelize = new Sq(dbSettings.database, dbSettings.username, dbSettings.password, {
  host: dbSettings.hostname,
  dialect: 'postgres',
  port: dbSettings.port,
  schema: dbSettings.schema,
  logging: null
});

// Import Application Models

//let dataHistory = sequelize.import(__dirname + '/dataHistory');
let user = sequelize.import(__dirname + '/user/user');

let userToken = sequelize.import(__dirname + '/user/userToken');
user.hasMany(userToken, {as: 'tokens', foreignKey: 'user_id'});
userToken.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id'});

// POG
let POG = sequelize.import(__dirname + '/POG');
let POGuser = sequelize.import(__dirname + '/POGUser');

POG.belongsToMany(user, {as: 'users', through: {model: POGuser, unique: false }, foreignKey: 'pog_id', otherKey: 'user_id', onDelete: 'CASCADE'});
user.belongsToMany(POG, {as: 'pogs', through: {model: POGuser, unique: false }, foreignKey: 'user_id', otherKey: 'pog_id', onDelete: 'CASCADE'});

POG.hasMany(POGuser, {as: 'POGUsers', foreignKey: 'pog_id', onDelete: 'CASCADE'});
POG.hasMany(POGuser, {as: 'POGUserFilter', foreignKey: 'pog_id', onDelete: 'CASCADE'});
POGuser.belongsTo(user, {as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL'});
POGuser.belongsTo(user, {as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE'});

let analysis = sequelize.import(__dirname + '/POGAnalysis');
POG.hasMany(analysis, {as: 'analysis', foreignKey: 'pog_id', onDelete: 'CASCADE'});
analysis.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', onDelete: 'CASCADE'});

// Pog Analysis Reports
let analysis_reports = sequelize.import(__dirname + '/reports/analysis_reports');
POG.hasMany(analysis_reports, {as: 'analysis_reports', foreignKey: 'pog_id', onDelete: 'CASCADE'});
analysis_reports.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', onDelete: 'CASCADE'});


let userGroup = sequelize.import(__dirname + '/user/userGroup.js');
let userGroupMember = sequelize.import(__dirname + '/user/userGroupMember.js');
user.belongsToMany(userGroup, {as: 'groups', through: {model: userGroupMember, unique: false }, foreignKey: 'user_id', otherKey: 'group_id', onDelete: 'CASCADE'});
userGroup.belongsToMany(user, {as: 'users', through: {model: userGroupMember, unique: false }, foreignKey: 'group_id', otherKey: 'user_id', onDelete: 'CASCADE'});
userGroup.belongsTo(user, {as: 'owner', model: user, foreignKey: 'owner_id', onDelete: 'SET NULL'});

let imageData = sequelize.import(__dirname + '/reports/imageData');
imageData.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', onDelete: 'CASCADE'});

// Patient Information
let patientInformation = sequelize.import(__dirname + '/patientInformation');

// Summary
let summary = {};
summary.tumourAnalysis = sequelize.import(__dirname + '/reports/genomic/summary/tumourAnalysis');
summary.mutationSummary = sequelize.import(__dirname + '/reports/genomic/summary/mutationSummary');
summary.variantCounts = sequelize.import(__dirname + '/reports/genomic/summary/variantCounts');
summary.genomicAlterationsIdentified = sequelize.import(__dirname + '/reports/genomic/summary/genomicAlterationsIdentified');
summary.genomicEventsTherapeutic = sequelize.import(__dirname + '/reports/genomic/summary/genomicEventsTherapeutic');
summary.analystComments = sequelize.import(__dirname + '/reports/genomic/summary/analystComments');
summary.pathwayAnalysis = sequelize.import(__dirname + '/reports/genomic/summary/pathwayAnalysis');
summary.probeTarget = sequelize.import(__dirname + '/reports/genomic/summary/probeTarget');
summary.therapeuticTargets = sequelize.import(__dirname + '/reports/genomic/summary/therapeuticTargets');
summary.microbial = sequelize.import(__dirname + '/reports/genomic/summary/microbial');

POG.hasMany(summary.therapeuticTargets, {as: 'therapeuticTargets', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true});

POG.hasOne(patientInformation, {as: 'patientInformation', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true});
analysis_reports.belongsTo(patientInformation, {as: 'patientInformation', foreignKey: 'pog_id', targetKey: 'pog_id'});
analysis_reports.belongsTo(user, {as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', controlled: true});

analysis_reports.hasOne(summary.tumourAnalysis, {as: 'tumourAnalysis', foreignKey: 'pog_report_id', onDelete: 'CASCADE', constraints: true});

summary.genomicEventsTherapeutic.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.mutationSummary.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.variantCounts.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.genomicAlterationsIdentified.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.genomicEventsTherapeutic.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.analystComments.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.pathwayAnalysis.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.probeTarget.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.microbial.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

summary.analystComments.belongsTo(user, {as: 'authorSignature', foreignKey: 'authorSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
summary.analystComments.belongsTo(user, {as: 'reviewerSignature', foreignKey: 'reviewerSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});

// DetailedGenomicAnalysis
let alterations = sequelize.import(__dirname + '/reports/genomic/detailedGenomicAnalysis/alterations');
let targetedGenes = sequelize.import(__dirname + '/reports/genomic/detailedGenomicAnalysis/targetedGenes');

alterations.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
targetedGenes.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Somatic Mutations
let somaticMutations = {};
somaticMutations.smallMutations = sequelize.import(__dirname + '/reports/genomic/somaticMutations/smallMutations');
somaticMutations.mutationSignature = sequelize.import(__dirname + '/reports/genomic/somaticMutations/mutationSignature');

somaticMutations.smallMutations.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
somaticMutations.mutationSignature.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Copy Number Analysis
let copyNumberAnalyses = {};
copyNumberAnalyses.cnv = sequelize.import(__dirname + '/reports/genomic/copyNumberAnalysis/cnv');

copyNumberAnalyses.cnv.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Structural Variation
let structuralVariation = {};
structuralVariation.sv = sequelize.import(__dirname + '/reports/genomic/structuralVariation/sv');

structuralVariation.sv.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Structural Variation
let expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import(__dirname + '/reports/genomic/expressionAnalysis/outlier');
expressionAnalysis.drugTarget = sequelize.import(__dirname + '/reports/genomic/expressionAnalysis/drugTarget');

expressionAnalysis.outlier.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
expressionAnalysis.drugTarget.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Data History
let POGDataHistory = sequelize.import(__dirname + '/POGDataHistory');
let POGDataHistoryTag = sequelize.import(__dirname + '/POGDataHistoryTag');
POGDataHistory.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
POGDataHistory.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
POG.hasMany(POGDataHistory, {as: 'dataHistory', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true});

POGDataHistory.hasMany(POGDataHistoryTag, {as: 'tags', foreignKey: 'history_id', onDelete: 'CASCADE', constraints: true});
POGDataHistoryTag.belongsTo(POGDataHistory, {as: 'history', foreignKey: 'history_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
POGDataHistoryTag.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
user.hasMany(POGDataHistory, {as: 'edits', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true});

// Data Export
let POGDataExport = sequelize.import(__dirname + '/POGDataExport');
POGDataExport.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
POGDataExport.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});

// Knowledgebase
let kb = {};
kb.references = sequelize.import(__dirname + '/knowledgebase/kb_references');
kb.references.belongsTo(user, {as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
kb.references.belongsTo(user, {as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});

kb.events = sequelize.import(__dirname + '/knowledgebase/kb_events');
kb.events.belongsTo(user, {as: 'createdBy', foreignKey: 'createdBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
kb.events.belongsTo(user, {as: 'reviewedBy', foreignKey: 'reviewedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});

kb.history = sequelize.import(__dirname + '/knowledgebase/kb_history');
kb.history.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
user.hasMany(kb.history, {as: 'kbedits', foreignKey: 'user_id', onDelete: 'SET NULL', constraints: true});


// Probe Report
let probeTestInformation = sequelize.import(__dirname + '/reports/probe/test_information');
probeTestInformation.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
probeTestInformation.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

let probeSignature = sequelize.import(__dirname + '/reports/probe/signature');
probeSignature.belongsTo(analysis_reports, {as: 'report', foreignKey: 'pog_report_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
probeSignature.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
probeSignature.belongsTo(user, {as: 'readySignature', foreignKey: 'readySignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});
probeSignature.belongsTo(user, {as: 'reviewerSignature', foreignKey: 'reviewerSignedBy_id', targetKey: 'id', onDelete: 'SET NULL', constraints: true});

// Tracking
let tracking = {};
tracking.task = sequelize.import(__dirname + '/tracking/state_task');
tracking.state = sequelize.import(__dirname + '/tracking/states');
tracking.definition = sequelize.import(__dirname + '/tracking/state_definitions');

tracking.state.belongsTo(analysis, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE', constraints: true});
tracking.state.belongsTo(user, {as: 'createdBy', foreignKey: 'createdBy_id', onDelete: 'SET NULL', constraints: true});

tracking.state.hasMany(tracking.task, {as: 'tasks', foreignKey: 'state_id', constraints: true});
tracking.state.belongsTo(userGroup, {as: 'group', foreignKey: 'group_id', onDelete: 'SET NULL', constraints: true});

tracking.task.belongsTo(tracking.state, {as: 'state', foreignKey: 'state_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
tracking.task.belongsTo(user, {as: 'assignedTo', foreignKey: 'assignedTo_id', onDelete: 'SET NULL', constraints: true});

tracking.definition.belongsTo(userGroup, {as: 'group', foreignKey: 'group_id', onDekete: 'SET NULL', constraints: true});

// Subscription
let subscription = sequelize.import(__dirname + '/pog_analysis_subscription');
subscription.belongsTo(analysis, {as: 'analysis', foreignKey: 'analysis_id', onDelete: 'CASCADE', constraints: true});
subscription.belongsTo(user, {as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE', constraints: true});

// Syncronize tables to model schemas
if(nconf.get('database:migrate') && nconf.get('database:hardMigrate')) {

  // If we're in production mode STOP!!
  if(nconf.get('env') === 'production') {
    console.log(colors.red('!!!! Hard Migration not supported in production mode !!!!'));
    process.exit();
  }

  sequelize.sync(
    {
      force: true,
      schema: nconf.get('database:postgres:schema')
    }).then(
    (res) => {
      console.log(colors.dim('[DB] ') + colors.bgGreen('Finished syncing'));
      
      // Create Admin User
      // Load in bcrypt
      let bcrypt = require(process.cwd() + '/lib/bcrypt');

      // Insert Admin User
      user.create({username: 'admin', password: bcrypt.hashSync('AdminMaster', 10), firstName: 'Admin', lastName: 'User', email: 'iprAdmin@bcgsc.ca', access: 'superUser'}).then(
        (result) => {
          console.log(colors.dim('[DB] ') + colors.bgGreen('Admin user created.'));

          userGroup.bulkCreate([
            {name: 'superUser', owner_id: 1},
            {name: 'admin', owner_id: 1},
            {name: 'analyst', owner_id: 1},
            {name: 'bioinformatician', owner_id: 1},
            {name: 'clinician', owner_id: 1},
          ]);
        },
        (error) => {
          console.log(colors.dim('[DB] ') + colors.bgRed('Unable to create admin user.'));
          console.log(error);
        }
      );


    },
    (err) => {
      console.log(err);
      console.log(colors.dim('[DB] ') + colors.bgRed('Unable to sync database'));
    }
  );
  console.log('!!! Wiping existing database structure and rebuilding from model schemas'.white.bgRed);
 
}
if(nconf.get('database:migrate') && !nconf.get('database:hardMigrate')) {
  sequelize.sync({schema: nconf.get('database:postgres:schema')});
  console.log('Updating database to match current model schemas'.white.bgRed);
}

module.exports = sequelize;
