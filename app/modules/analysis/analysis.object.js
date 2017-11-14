"use strict";

const db          = require(process.cwd() + '/app/models/');


class Analysis {
  
  /**
   * Patient Analysis constructor
   *
   * @param {object} init - Optional initial value
   * @param {object} opts - Optional arguments to pass into constructor
   * @param {boolean} newEntry - Creating a new entry
   */
  constructor(init=undefined, opts={}, newEntry=false) {
    
    if(!init && !newEntry) throw new Error('Existing patient analysis model object is required if not creating a new entry');
    this.instance = init;
    
    this.model = db.models.pog_analysis;
  }
  
  
  /**
   * Create new Patient Analysis entry
   *
   * @param {object} pog - SequelizeJS Model POG object
   * @param {object} options - Hashmap of analysis attributes
   *
   * @returns {Promise}
   */
  create(pog, options) {
  
    return new Promise((resolve, reject) => {
    
      let data = { };
    
      if(!pog.id) throw new Error('Invalid POG object passed to analysis create');
      
      data.pog_id = pog.id;
    
      // Check for nonPOG flag
      if(options.nonPOG) data.nonPOG = true;
    
      // Optional Analysis settings that can be passed in
      if(options.name) data.name = options.name;
      if(options.clinical_biopsy) data.clinical_biopsy = options.clinical_biopsy;
      if(options.analysis_biopsy) data.analysis_biopsy = options.analysis_biopsy;
      if(options.priority) data.priority = options.priority;
      if(options.disease) data.disease = options.disease;
      if(options.biopsy_notes) data.biopsy_notes = options.biopsy_notes;
      if(options.libraries) data.libraries = options.libraries;
      if(options.bioapps_source_id) data.bioapps_source_id = options.bioapps_source_id;
      if(options.biopsy_date) data.biopsy_date = options.biopsy_date;
      if(options.threeLetterCode) data.threeLetterCode = options.threeLetterCode;
    
      this.model.create(data)
        .then((analysis) => {
          this.instance = analysis;
        
          resolve(this.instance);
        })
        .catch((err) => {
          // Unable to create POG
          console.log('Failed to create the patient analysis entry', err);
          reject({message: 'Unable to create patient analysis entry', status: 500, error: err});
        });
    });
    
  }
  
  /**
   * Update values on analysis
   *
   * @param data
   * @returns {Promise}
   */
  update(data) {
    
    return new Promise((resolve, reject) => {
  
      // Update Payload
      let update = { libraries: {} };
  
      // Fields that can be updated
      if(data.name) update.name = this.instance.name = data.name;
      if(data.clinical_biopsy) update.clinical_biopsy = this.instance.clinical_biopsy = data.clinical_biopsy;
      if(data.analysis_biopsy) update.analysis_biopsy = this.instance.analysis_biopsy = data.analysis_biopsy;
      if(data.priority) update.priority = this.instance.priority = data.priority;
      if(data.disease) update.disease = this.instance.disease = data.disease;
      if(data.biopsy_notes) update.biopsy_notes = this.instance.biopsy_notes = data.biopsy_notes;
  
      if(data.libraries && data.libraries.normal) update.libraries.normal = this.instance.libraries.normal = data.libraries.normal;
      if(data.libraries && data.libraries.tumour) update.libraries.tumour = this.instance.libraries.tumour = data.libraries.tumour;
      if(data.libraries && data.libraries.transcriptome) update.libraries.transcriptome = this.instance.libraries.transcriptome = data.libraries.transcriptome;
  
      if(data.bioapps_source_id) update.bioapps_source_id = this.instance.bioapps_source_id = data.bioapps_source_id;
      if(data.biopsy_date) update.biopsy_date = this.instance.biopsy_date = data.biopsy_date;
      if(data.threeLetterCode) update.threeLetterCode = this.instance.threeLetterCode = data.threeLetterCode;
  
      // Return a promise.
      this.model.update(data, {where: {ident: this.instance.ident}})
        .then(this.getPublic.bind(this))
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          console.log(err);
          reject({message: err.message});
        });
      
    });
    
  }
  
  /**
   * Update data values from LIMS sync
   *
   * @param {object} libraries - libraries hashmap
   * @param {string} biopsy_notes - Confirmed biopsy_notes from LIMS
   * @param {string} disease - Confirmed disease name from LIMS
   *
   * @returns {Promise}
   */
  limsSync(libraries, biopsy_notes, disease) {
    return new Promise((resolve, reject) => {
      
      this.instance.libraryes = libraries;
      this.instance.biopsy_notes = biopsy_notes;
      this.instance.disease = disease;
      
      resolve(this.instance.save());
    });
  }
  
  /**
   *
   * @param {object} libraries - libraries hashmap
   * @param {string} analysis_biopsy - The BioApps biopsy ident (eg biop1)
   * @param {string} disease - The updated/filtered disease name
   * @param {integer} bioapps_source_id - The BioApps source_id primary key
   *
   * @returns {Promise}
   */
  bioAppsSync(libraries, analysis_biopsy, disease, bioapps_source_id) {
    return new Promise((resolve, reject) => {
      
      this.instance.libraryes = libraries;
      this.instance.analysis_biopsy = analysis_biopsy;
      this.instance.disease = disease;
      this.instance.bioapps_source_id = bioapps_source_id;
  
      resolve(this.instance.save());
    });
  }
  
  
  bindUser() {
  
  }
  
  unbindUser() {
  
  }
  
  /**
   * Get public version of this instance
   *
   * @returns {Promise} - Resolves with a public instance of the model
   */
  getPublic() {
    return new Promise((resolve, reject) => {
      
      let opts = {where: {}};
  
      // Check if it's a UUID
      opts.where.ident = this.instance.ident;
      opts.attributes = {exclude: ['deletedAt']};
    
      // Lookup POG first
      this.model.scope('public').findOne(opts).then(
        (result) => {
          // Nothing found?
          if(result === null) return reject({message: 'Unable to find the requested analysis'});
      
          // POG found, next()
          if(result !== null) {
            resolve(result);
          }
        },
        (error) => {
          console.log(error);
          if(result === null) reject({message: 'Unable to find the requested analysis'});
        }
      );
      
    });
  }
  
  
}

// Return Analysis class
module.exports = Analysis;