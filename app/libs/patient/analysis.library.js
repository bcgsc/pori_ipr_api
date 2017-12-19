"use strict";

const db          = require(process.cwd() + '/app/models');
const lodash      = require('lodash');
const logger      = process.logger;

/**
 * Patient Biopsy Analysis library
 *
 * Creates, retrieves, mutates pog_analysis records
 *
 * @type {{retrieveOrCreate: (function(integer, string=, string=, Object=)), create: (function(string, string)), public: (function(string))}}
 */
module.exports = {
  
  /**
   * Retrieve or create biopsy analysis record
   *
   * @param {integer} pog_id - Internal pog_id identifier
   * @param {string} biop - Analysis biopsy identifier
   * @param {string} clinspec - Clinical biopsy identifier
   * @param {object} options - Data to insert into new POG Analysis row
   *
   * Options:
   *  {
   *    libraries - json dict of libraries: {normal: A12345, tumour: B12345, transcriptome: C12345}
   *    analysis_biopsy - string of bioapps biopsy: biop1
   *    clinical_biopsy - string of clinical biopsy: clinspec1
   *    notes - General notes
   *    bioapps_source_id - source row id from BioApps
   *    onco_panel_submitted - Date of data export for onco panel
   *    comparator_disease(jsonb) - {}
   *    comparator_normal(jsonb) - {disease_comparator_for_analysis: str, gtex_comparator_primary_site: str, normal_comparator_biopsy_site: str, normal_comparator_primary_site: str}
   *    biopsy_site - String of biopsy site
   *    biopsy_type - Type of biopsy
   *    date_analysis - Date the BioFX analysis is due
   *    date_presentation - Date the presentation is due
   *    biopsy_date - Date of the biopsy
   *    threeLetterCode - Three letter code: BRC
   *  }
   *
   * @returns {Promise/Object} - Resolves with biopsy analysis model object
   */
  retrieveOrCreate: (pog_id, biop=null, clinspec=null, options={}) => {
    return new Promise((resolve, reject) => {
      
      if(!pog_id) reject({message: 'pog_id is required'});
      
      // Create data object
      let data = {};
      
      // Find existing object
      let where = {
        $or: []
      };
      
      // If Biopsy is specified
      if(biop !== null) {
        where.$or.push({
          pog_id: pog_id,
          analysis_biopsy: biop
        });
      }
      
      // If clinspec is specified
      if(clinspec !== null) {
        where.$or.push({
          pog_id: pog_id,
          clinical_biopsy: clinspec
        });
      }
      
      // If a library is specified
      if(options.library) {
        let libwhere = {};
        
        libwhere.pog_id = pog_id;
        
        if(options.libraries.normal) libwhere.libraries = {$contains: {normal: options.libraries.normal}};
        if(options.libraries.tumour) libwhere.libraries = {$contains: {tumour: options.libraries.tumour}};
        if(options.libraries.transcriptome) libwhere.libraries = {$contains: {transcriptome: options.libraries.transcriptome}};
        
        if(_.keys(libwhere).length > 1 ) where.$or.push(libwhere);
      }
      
      // If the ident string is set
      if(options.ident) {
        where.$or.ident = options.ident;
      }
      
      if(where.$or.length === 0) reject({message: 'Insufficient indexes to find or create new analysis entry'});
      
      
      // Building data block for new entries
      data.pog_id = pog_id;
      if(biop) data.analysis_biopsy = biop;
      if(clinspec) data.clinical_biopsy = clinspec;
      if(options.libraries) data.libraries = options.libraries;
      if(options.notes) data.notes = options.notes;
      if(options.bioapps_source_id) data.bioapps_source_id = options.bioapps_source_id;
      if(options.onco_panel_submitted) data.onco_panel_submitted = options.onco_panel_submitted;
      if(options.comparator_disease) data.comparator_disease = options.comparator_disease;
      if(options.comparator_normal) data.comparator_normal = options.comparator_normal;
      if(options.biopsy_site) data.biopsy_site = options.biopsy_site;
      if(options.biopsy_type) data.biopsy_type = options.biopsy_type;
      if(options.date_analysis) data.date_analysis = options.date_analysis;
      if(options.date_presentation) data.date_presentation = options.date_presentation;
      if(options.biopsy_date) data.biopsy_date = options.biopsy_date;
      if(options.threeLetterCode) data.threeLetterCode = options.threeLetterCode;
      
      
      db.models.pog_analysis.findOrCreate({ where: where, defaults: data})
        .then((result) => {
          let analysis = result[0];
          let created = result[1];
          resolve(analysis);
        })
        .catch((e) => {
          reject({message: `failed to retrieve or biopsy analysis record. Reason: ${e.message}`});
          logger.error('Failed to retrieve or create biopsy analysis record', e);
        });
      
    })
  },
  
  /**
   * Create biopsy analysis record
   *
   * @param {int/object} patient - Either patient model object or pog_id
   * @param {object} options - Patient analysis extended settings
   *
   *
   * Options:
   *  {
   *    libraries - json dict of libraries: {normal: A12345, tumour: B12345, transcriptome: C12345}
   *    analysis_biopsy - string of bioapps biopsy: biop1
   *    clinical_biopsy - string of clinical biopsy: clinspec1
   *    notes - General notes
   *    bioapps_source_id - source row id from BioApps
   *    onco_panel_submitted - Date of data export for onco panel
   *    comparator_disease(jsonb) - {}
   *    comparator_normal(jsonb) - {disease_comparator_for_analysis: str, gtex_comparator_primary_site: str, normal_comparator_biopsy_site: str, normal_comparator_primary_site: str}
   *    biopsy_site - String of biopsy site
   *    biopsy_type - Type of biopsy
   *    date_analysis - Date the BioFX analysis is due
   *    date_presentation - Date the presentation is due
   *    biopsy_date - Date of the biopsy
   *    disease - Disease/Diagnosis
   *    threeLetterCode - Three letter code: BRC
   *  }
   *
   * @returns {Promise/object} - Resolves with created patient analysis model object
   */
  create: (patient, options) => {
    return new Promise((resolve, reject) => {
      
      if(!patient) reject({message: 'Patient pog_id or patient model object reqiured to create new analysis'});
      
      if(typeof patient === 'object') patient = patient.id;
      
      if(typeof patient !== 'number') reject({message: 'Invalid patient ID provided (not an integer or resolved from object to be integer)'});
      
      let data = {};
      
      // Building data block for new entries
      data.pog_id = patient;
      if(options.analysis_biopsy) data.analysis_biopsy = options.analysis_biopsy;
      if(options.clinical_biopsy) data.clinical_biopsy = options.clinical_biopsy;
      if(options.libraries) data.libraries = options.libraries;
      if(options.notes) data.notes = options.notes;
      if(options.disease) data.disease = options.disease;
      if(options.bioapps_source_id) data.bioapps_source_id = options.bioapps_source_id;
      if(options.onco_panel_submitted) data.onco_panel_submitted = options.onco_panel_submitted;
      if(options.comparator_disease) data.comparator_disease = options.comparator_disease;
      if(options.comparator_normal) data.comparator_normal = options.comparator_normal;
      if(options.biopsy_site) data.biopsy_site = options.biopsy_site;
      if(options.biopsy_type) data.biopsy_type = options.biopsy_type;
      if(options.date_analysis) data.date_analysis = options.date_analysis;
      if(options.date_presentation) data.date_presentation = options.date_presentation;
      if(options.biopsy_date) data.biopsy_date = options.biopsy_date;
      if(options.threeLetterCode) data.threeLetterCode = options.threeLetterCode;
      
      db.models.pog_analysis.create(data)
        .then((analysis) => {
          resolve(analysis);
        })
        .catch((e) => {
          reject({message: `Failed to create new patient biopsy record for internal reasons: ${e.message}`});
          logger.error('Failed to create new analysis record');
        });
    });
  },
  
  /**
   * Get public version of record
   *
   * @param {string} ident - Patient analysis ident
   *
   * @returns {Promise}
   */
  public: (ident) => {
    return new Promise((resolve, reject) => {
      
      db.models.pog_analysis.scope('public').findAll({where: {ident: ident}})
        .then((analysis) => {
          resolve(analysis);
        })
        .catch((e) => {
          reject({message: `Failed to retrieve public scope of patient analysis record: ${e.message}`});
          logger.error('Failed to retrieve public version of patient analysis record', e);
        });
      
    });
  },
  
  /**
   * Synchronize Analysis record with BioApps
   *
   * TODO: Build BioApps sync chain
   *
   * @param {object} anaylsis - DB Model Object
   *
   * @returns {Promise}
   */
  syncBiopApps: (anaylsis) => {
    return new Promise((resolve, reject) => {
      
      let Model = db.define('Model', {},{db});
      
      if(!(analysis instanceof Model)) reject({message: 'The provided analysis object is not a valid model instance'});
      
      
    })
  }
  
};