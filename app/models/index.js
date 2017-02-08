"use strict";
let Sq = require('sequelize');
let path = require('path');
let nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
let colors = require('colors');

// If testing, override config
if(process.env.NODE_ENV === 'test') {
  nconf.file({file: './config/test.json'});
}

// Load database
let sequelize = new Sq('main', 'root', '', {storage: process.cwd() + '/database/development.sqlite', dialect: 'sqlite', logging:((nconf.get('env') == 'debug') ? console.log : null)});
//let sequelize = new Sq('main', 'root', '', {storage: process.cwd() + '/database/development.sqlite', dialect: 'sqlite'});

// Import Application Models
let dataHistory = sequelize.import(__dirname + '/dataHistory');
let user = sequelize.import(__dirname + '/user');
let userToken = sequelize.import(__dirname + '/userToken');

user.hasMany(userToken, {as: 'tokens', foreignKey: 'user_id'});
userToken.belongsTo(user, {as: 'user', foreignKey: 'user_id', targetKey: 'id'});

// POG
let POG = sequelize.import(__dirname + '/POG');
let imageData = sequelize.import(__dirname + '/imageData');

imageData.belongsTo(POG, {as: 'POG', foreignKey: 'pog_id'});

// Summary
let summary = {};
summary.patientInformation = sequelize.import(__dirname + '/summary/patientInformation');
summary.tumourAnalysis = sequelize.import(__dirname + '/summary/tumourAnalysis');
summary.mutationSummary = sequelize.import(__dirname + '/summary/mutationSummary');
summary.variantCounts = sequelize.import(__dirname + '/summary/variantCounts');
summary.genomicAlterationsIdentified = sequelize.import(__dirname + '/summary/genomicAlterationsIdentified');
summary.genomicEventsTherapeutic = sequelize.import(__dirname + '/summary/genomicEventsTherapeutic');
summary.analystComments = sequelize.import(__dirname + '/summary/analystComments');
summary.probeTarget = sequelize.import(__dirname + '/summary/probeTarget');

POG.hasOne(summary.patientInformation, {as: 'patientInformation', foreignKey: 'pog_id'});
POG.hasOne(summary.tumourAnalysis, {as: 'tumourAnalysis', foreignKey: 'pog_id'});

// DetailedGenomicAnalysis
let alterations = sequelize.import(__dirname + '/detailedGenomicAnalysis/alterations');
let targetedGenes = sequelize.import(__dirname + '/detailedGenomicAnalysis/targetedGenes');

// Somatic Mutations
let somaticMutations = {};
somaticMutations.smallMutations = sequelize.import(__dirname + '/somaticMutations/smallMutations');

// Copy Number Analysis
let copyNumberAnalyses = {};
copyNumberAnalyses.cnv= sequelize.import(__dirname + '/copyNumberAnalysis/cnv');

// Structural Variation
let structuralVariation = {};
structuralVariation.sv= sequelize.import(__dirname + '/structuralVariation/sv');


// Structural Variation
let expressionAnalysis = {};
expressionAnalysis.outlier = sequelize.import(__dirname + '/expressionAnalysis/outlier');
expressionAnalysis.drugTarget = sequelize.import(__dirname + '/expressionAnalysis/drugTarget');

//POG.hasMany(alterations, {as: 'detailedGenomicAnalysis.alterations', foreignKey: 'pog_id'});
//alterations.belongsTo(POG, { as: 'pog', foreignKey: 'pog_id'});

// Syncronize tables to model schemas
if(nconf.get('database:migrate') && nconf.get('database:hardMigrate')) {
  sequelize.sync({force: true}).then(
    (res) => {
      console.log(colors.dim('[DB] ') + colors.bgGreen('Finished syncing'));
      
      // Create Admin User
      // Load in bcrypt
      let bcrypt = require('bcrypt-nodejs');
      
      // Insert Admin User
      user.create({username: 'admin', password: bcrypt.hashSync('admin'), firstName: 'Admin', lastName: 'User', email: 'iprAdmin@bcgsc.ca', access: 'admin'}).then(
        (result) => {
          console.log(colors.dim('[DB] ') + colors.bgGreen('Admin user created.'));
        },
        (error) => {
          console.log(colors.dim('[DB] ') + colors.bgRed('Unable to create admin user.'));
        }
      );
      
    },
    (err) => {
      console.log(colors.dim('[DB] ') + colors.bgRed('Unable to sync database'));
    }
  );
  console.log('!!! Wiping existing database structure and rebuilding from model schemas'.white.bgRed);
 
}
if(nconf.get('database:migrate') && !nconf.get('database:hardMigrate')) {
  sequelize.sync();
  console.log('Updating database to match current model schemas'.white.bgRed);
}

module.exports = sequelize;
