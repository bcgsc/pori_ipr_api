"use strict";

const db          = require(process.cwd() + '/app/models');
const _      = require('lodash');
const logger      = process.logger;
const errors = Object.freeze({
  sequelizeErr: new Error('Sequelize Error')
})

module.exports = {
  
  /**
   * Retrieve or Create patient ID
   *
   * @param {string} patientID - Patient ID string, eg: POG1234
   * @param {string} project - Project name the patient is associated with
   *
   * @returns {Promise/Object} - Resolves with patient model object
   */
  retrieveOrCreate: (patientID, project=null) => {
    return new Promise((resolve, reject) => {
      
      if(!patientID) reject({message: 'Patient ID is required to retrieve or create patient entry'});
      
      let patient;
      db.models.POG.findOrCreate({ where: { POGID: patientID }, defaults: { POGID: patientID, project: project }})
        .then((result) => {
          patient = result[0];
          let created = result[1];

          if(created && project) { // new POG record and project specified - find project or create if it doesn't exist already
            return db.models.project.findOrCreate({ where: { name: project }, defaults: { name: project } });
          }

          resolve(patient);
          
        })
        .then((projectResult) => {
          let bindProject = projectResult[0]; // created/retrieved project

          // See if patient and project are already bound
          if(_.find(bindProject.pogs, {'ident': bindProject.ident})) resolve(patient); // binding already exists - resolve pog

          // Bind POG to project
          return db.models.pog_project.create({project_id: bindProject.id, pog_id: patient.id});
        })
        .then((pog_project) => {
          resolve(patient);
        })
        .catch((e) => {
          logger.error('Failed to retrieve/create patient record', e);
          res.status(500).json(e);
        });
    
    })
  },
  
  /**
   * Create patient record
   *
   * @param {string} patientID - Patient string identifier, eg: POG1234
   * @param {string} project - Project name the patient is associated with, eg: POG
   *
   * @returns {Promise} - Resolves with created patient entry model object
   */
  create: (patientID, project) => {
    return new Promise((resolve, reject) => {
      
      db.models.POG.create({POGID: patientID, project: project})
        .then((patient) => {
          resolve(patient);
        })
        .catch((e) => {
          reject({message: `Failed to create new patient record for internal reasons: ${e.message}`});
          logger.error('Failed to create new patient/pog record');
        });
    });
  },
  
  /**
   * Get public version of record
   *
   * @param {string} patientID - PatientID string identifier
   *
   * @returns {Promise}
   */
  public: (patientID) => {
    return new Promise((resolve, reject) => {
    
      db.models.POG.scope('public').findAll({where: {POGID: patientID}})
        .then((patient) => {
          resolve(patient);
        })
        .catch((e) => {
          reject({message: `Failed to retrieve public scope of patient record: ${e.message}`});
          logger.error('Failed to retrieve public version of patient record', e);
        });
    
    });
  }
  
};