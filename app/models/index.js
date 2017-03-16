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
let user = sequelize.import(__dirname + '/user');

let userToken = sequelize.import(__dirname + '/userToken');
user.hasMany(userToken, {as: 'tokens', foreignKey: 'user_id'});
userToken.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id'});

// POG
let POG = sequelize.import(__dirname + '/POG');
let POGuser = sequelize.import(__dirname + '/POGUser');

POG.belongsToMany(user, {as: 'users', through: {model: POGuser, unique: false }, foreignKey: 'pog_id', otherKey: 'user_id', onDelete: 'CASCADE'});
user.belongsToMany(POG, {as: 'pogs', through: {model: POGuser, unique: false }, foreignKey: 'user_id', otherKey: 'pog_id', onDelete: 'CASCADE'});

POG.hasMany(POGuser, {as: 'POGUsers', foreignKey: 'pog_id', onDelete: 'CASCADE'});
POGuser.belongsTo(user, {as: 'addedBy', foreignKey: 'addedBy_id', onDelete: 'SET NULL'});
POGuser.belongsTo(user, {as: 'user', foreignKey: 'user_id', onDelete: 'CASCADE'});

let userGroup = sequelize.import(__dirname + '/userGroup.js');
let userGroupMember = sequelize.import(__dirname + '/userGroupMember.js');
user.belongsToMany(userGroup, {as: 'groups', through: {model: userGroupMember, unique: false }, foreignKey: 'user_id', otherKey: 'group_id', onDelete: 'CASCADE'});
userGroup.belongsToMany(user, {as: 'users', through: {model: userGroupMember, unique: false }, foreignKey: 'group_id', otherKey: 'user_id', onDelete: 'CASCADE'});

let imageData = sequelize.import(__dirname + '/imageData');
imageData.belongsTo(POG, {as: 'POG', foreignKey: 'pog_id', onDelete: 'CASCADE'});

// Summary
let summary = {};
summary.patientInformation = sequelize.import(__dirname + '/summary/patientInformation');
summary.tumourAnalysis = sequelize.import(__dirname + '/summary/tumourAnalysis');
summary.mutationSummary = sequelize.import(__dirname + '/summary/mutationSummary');
summary.variantCounts = sequelize.import(__dirname + '/summary/variantCounts');
summary.genomicAlterationsIdentified = sequelize.import(__dirname + '/summary/genomicAlterationsIdentified');
summary.genomicEventsTherapeutic = sequelize.import(__dirname + '/summary/genomicEventsTherapeutic');
summary.analystComments = sequelize.import(__dirname + '/summary/analystComments');
summary.pathwayAnalysis = sequelize.import(__dirname + '/summary/pathwayAnalysis');
summary.probeTarget = sequelize.import(__dirname + '/summary/probeTarget');

POG.hasOne(summary.patientInformation, {as: 'patientInformation', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true});
POG.hasOne(summary.tumourAnalysis, {as: 'tumourAnalysis', foreignKey: 'pog_id', onDelete: 'CASCADE', constraints: true});

summary.genomicEventsTherapeutic.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.mutationSummary.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.variantCounts.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.genomicAlterationsIdentified.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.genomicEventsTherapeutic.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.analystComments.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.pathwayAnalysis.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
summary.probeTarget.belongsTo(user, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// DetailedGenomicAnalysis
let alterations = sequelize.import(__dirname + '/detailedGenomicAnalysis/alterations');
let targetedGenes = sequelize.import(__dirname + '/detailedGenomicAnalysis/targetedGenes');

alterations.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
targetedGenes.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Somatic Mutations
let somaticMutations = {};
somaticMutations.smallMutations = sequelize.import(__dirname + '/somaticMutations/smallMutations');
somaticMutations.mutationSignature = sequelize.import(__dirname + '/somaticMutations/mutationSignature');

somaticMutations.smallMutations.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
somaticMutations.mutationSignature.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Copy Number Analysis
let copyNumberAnalyses = {};
copyNumberAnalyses.cnv = sequelize.import(__dirname + '/copyNumberAnalysis/cnv');

copyNumberAnalyses.cnv.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Structural Variation
let structuralVariation = {};
structuralVariation.sv = sequelize.import(__dirname + '/structuralVariation/sv');

structuralVariation.sv.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

// Structural Variation
let expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import(__dirname + '/expressionAnalysis/outlier');
expressionAnalysis.drugTarget = sequelize.import(__dirname + '/expressionAnalysis/drugTarget');

expressionAnalysis.outlier.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});
expressionAnalysis.drugTarget.belongsTo(POG, {as: 'pog', foreignKey: 'pog_id', targetKey: 'id', onDelete: 'CASCADE', constraints: true});

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


// Syncronize tables to model schemas
if(nconf.get('database:migrate') && nconf.get('database:hardMigrate')) {
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
