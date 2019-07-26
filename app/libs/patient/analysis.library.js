const {Op} = require('sequelize');
const db = require('../../models');

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
   * @param {integer} pogId - Internal pog_id identifier
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
   *    physician - A JSON array of {first_nane: str, last_name: str}
   *    pediatric_id - A string name for pediatric POG cases: P012
   *  }
   *
   * @returns {Promise.<object>} - Resolves with biopsy analysis model object
   */
  retrieveOrCreate: async (pogId, biop = null, clinspec = null, options = {}) => {

    if (!pogId) {
      throw new Error('pogId is required');
    }
    // Create data object
    const data = {};
    const availableOptions = [];

    // If Biopsy is specified
    if (biop !== null) {
      availableOptions.push({
        pog_id: pogId,
        analysis_biopsy: biop,
      });
    }

    // If clinspec is specified
    if (clinspec !== null) {
      availableOptions.push({
        pog_id: pogId,
        clinical_biopsy: clinspec,
      });
    }

    // If a library is specified
    if (options.libraries) {
      const libwhere = {};
      libwhere.pog_id = pogId;

      if (options.libraries.normal) {
        libwhere.libraries = {[Op.contains]: {normal: options.libraries.normal}};
      }

      if (Object.keys(libwhere).length > 1) {
        availableOptions.push(libwhere);
      }
    }

    // If the ident string is set
    if (options.ident) {
      availableOptions.ident = options.ident;
    }

    if (availableOptions.length === 0) {
      throw new Error('Insufficient indexes to find or create new analysis entry');
    }

    const where = {
      [Op.or]: availableOptions,
    };

    // Building data block for new entries
    data.pog_id = pogId;
    if (biop) {
      data.analysis_biopsy = biop;
    }
    if (options.libraries) {
      data.libraries = options.libraries;
    }

    const [result] = await db.models.pog_analysis.findOrCreate({where, defaults: data});
    return result;
  },

  /**
   * Create biopsy analysis record
   *
   * @param {object|int} patient - Either patient model object or pog_id
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
   *    physician - A JSON array of {first_nane: str, last_name: str}
   *    pediatric_id - A string name for pediatric POG cases: P012
   *  }
   *
   * @returns {Promise.<object>} - Resolves with created patient analysis model object
   */
  create: async (patient, options) => {     
    if (!patient) {
      throw new Error('Patient pog_id or patient model object reqiured to create new analysis');
    }
    if (typeof patient === 'object') {
      patient = patient.id;
    }
    if (typeof patient !== 'number') {
      throw new Error('Invalid patient ID provided (not an integer or resolved from object to be integer)');
    }

    const data = {};

    // Building data block for new entries
    data.pog_id = patient;
    if (options.analysis_biopsy) {
      data.analysis_biopsy = options.analysis_biopsy;
    }
    if (options.clinical_biopsy) {
      data.clinical_biopsy = options.clinical_biopsy;
    }
    if (options.libraries) {
      data.libraries = options.libraries;
    }
    if (options.notes) {
      data.notes = options.notes;
    }
    if (options.disease) {
      data.disease = options.disease;
    }
    if (options.bioapps_source_id) {
      data.bioapps_source_id = options.bioapps_source_id;
    }
    if (options.onco_panel_submitted) {
      data.onco_panel_submitted = options.onco_panel_submitted;
    }
    if (options.comparator_disease) {
      data.comparator_disease = options.comparator_disease;
    }
    if (options.comparator_normal) {
      data.comparator_normal = options.comparator_normal;
    }
    if (options.biopsy_site) {
      data.biopsy_site = options.biopsy_site;
    }
    if (options.biopsy_type) {
      data.biopsy_type = options.biopsy_type;
    }
    if (options.date_analysis) {
      data.date_analysis = options.date_analysis;
    }
    if (options.date_presentation) {
      data.date_presentation = options.date_presentation;
    }
    if (options.biopsy_date) {
      data.biopsy_date = options.biopsy_date;
    }
    if (options.threeLetterCode) {
      data.threeLetterCode = options.threeLetterCode;
    }
    if (options.physician) {
      data.physician = options.physician;
    }
    if (options.pediatric_id) {
      data.pediatric_id = options.pediatric_id;
    }

    return db.models.pog_analysis.create(data);
  },

  /**
   * Get public version of record
   *
   * @param {string} ident - Patient analysis ident
   *
   * @returns {Promise.<Array.<Model>>} - Returns all public pog analysis that match the given ident
   */
  public: async (ident) => {    
    return db.models.pog_analysis.scope('public').findAll({where: {ident}});
  },

  /**
   * Synchronize Analysis record with BioApps
   *
   * TODO: Build BioApps sync chain
   *
   * @param {object} analysis - DB Model Object
   * @returns {Promise.<boolean>} - Returns true if sync was successful
   */
  syncBiopApps: async (analysis) => {
    const model = db.define('Model', {}, {db});

    if (!(analysis instanceof model)) {
      throw new Error('The provided analysis object is not a valid model instance');
    }
    return true;
  },
};
