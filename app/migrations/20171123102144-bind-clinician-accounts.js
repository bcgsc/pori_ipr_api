'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');
const summaryLoader = require(process.cwd() + '/app/loaders/summary/mutationSummary');
const logger = require(process.cwd() + '/app/libs/logger');
const Report = require(process.cwd() + '/app/libs/structures/analysis_report');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  process.exit();
}

let clinReportAssocs = [];
let admin;

let getAdmin = () => {
  return new Promise((resolve, reject) => {
    
    db.models.user.findOne({where: {username: 'bpierce'}})
      .then((user) => {
        admin = user;
        console.log('[getAdmin] Retrieved admin account');
        resolve();
      })
      .catch((e) => {
        console.log('Failed to get bpierce user');
        reject({message: 'failed to get bpierce user account'});
      });
    
  });
};

let getReportClinicianAssoc = () => {
  
  
  console.log('[getReportClinicianAssoc] Running Query for Joined Clin Ref');
  
  return db.query("select pog_analysis_reports.id, \"POGs\".\"POGID\", pog_patient_information.physician, users.username, users.id AS userid, users.ident as \"userIdent\" from pog_analysis_reports JOIN pog_analysis ON pog_analysis.id = pog_analysis_reports.analysis_id JOIN \"POGs\" ON \"POGs\".id = pog_analysis.pog_id JOIN pog_patient_information ON pog_patient_information.pog_id = \"POGs\".id JOIN users ON users.\"lastName\" ILIKE REPLACE(pog_patient_information.physician, 'Dr. ', '')")
  
};


let getReportObjects = (cra) => {
  
  clinReportAssocs = cra[0];
  
  console.log(`Found ${clinReportAssocs.length} entries`);
  
  let opts = {
    where: {
      id: {
        $in: _.map(clinReportAssocs, 'id')
      }
    },
    include: [
      {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
      {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
      {model: db.models.POG.scope('public'), as: 'pog' },
      {model: db.models.user.scope('public'), as: 'createdBy'},
      {model: db.models.analysis_reports_user, as: 'users', separate: true, include: [
        {model: db.models.user.scope('public'), as: 'user'}
      ]}
    ],
  };
  
  console.log('[getReportObjects] Getting full report objects');
  
  return db.models.analysis_report.findAll(opts);
  
};


let bindReports = (reports) => {
  
  return Promise.all(_.map(reports, (r) => {
  
    let report = new Report(r);
    
    // Find ClinReportAssoc row
    let cra = _.find(clinReportAssocs, {id: r.id});
    
    /*
    return new Promise((resolve, reject) => {
      resolve();
    });*/
    
    
    
    return report.bindUser(cra.userIdent, 'clinician', admin);
    
  }))
  
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
getAdmin()
  .then(getReportClinicianAssoc)
  .then(getReportObjects)
  .then(bindReports)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });