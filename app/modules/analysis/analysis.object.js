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
      
      if(data.name) this.instance.name = data.name;
      if(data.clinical_biopsy) this.instance.clinical_biopsy = data.clinical_biopsy;
      if(data.analysis_biopsy) this.instance.analysis_biopsy = data.analysis_biopsy;
      if(data.priority) this.instance.priority = data.priority;
      if(data.disease) this.instance.disease = data.disease;
      if(data.biopsy_notes) this.instance.biopsy_notes = data.biopsy_notes;
      if(data.libraries) this.instance.libraries = data.libraries;
      if(data.bioapps_source_id) this.instance.bioapps_source_id = data.bioapps_source_id;
      
      resolve(this.instance.save());
      
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
  
  
}