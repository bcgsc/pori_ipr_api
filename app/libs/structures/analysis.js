const db = require('../../../../app/models');

class POG {
  /**
   * Construct Analysis
   *
   * @param {string|object} input - Input, either string of analysis or clinical biopsy, or object of existing analysis model instance
   * @param {object} pog - The POG instance this analysis belongs to
   * @param newAnalysis
   */
  constructor(input, pog=null, newAnalysis=false) {
    this.analysis_biopsy = (typeof input === 'string' && input.indexOf('biop_') > -1) ? input : null;
    this.clinical_biopsy = (typeof input === 'string' && input.indexOf('biospec_') > -1) ? input : null;
    this.instance = (typeof input === 'object') ? input : null;
    this.model = db.models.pog_analysis;
    this.pog = pog;
  }

  /**
   * Retrieve entry from database
   *
   * @returns {promise|object} - Resolves with database instance of model
   */
  async retrieve(options) {

    // Return cached object
    if (this.instance) {
      return this.instance;
    }

    const opts = {};
    opts.where = {}
    if (this.analysis_biopsy) {
      opts.where.analysis_biopsy = this.analysis_biopsy;
    }
    if (this.clinical_biopsy) {
      opts.where.clinical_biopsy = this.clinical_biopsy;
    }
    opts.where.pog_id = this.pog.id;
    opts.include = [
      { as: 'pog', model: db.models.POG.scope('public') },
    ];

    // Lookup in Database
    const analysis = this.model.findOne(opts);

    // Not found, and asked to create
    if (analysis === null && options.create) {

      // Run create
      this.instance = await this.create(options);
      return this.instance;
    }

    // POG not found
    if (analysis === null) {
      return null;
    } else {
      this.pog = analysis.pog;
      this.instance = analysis;
      return this.instance;
    }
  }

  /**
   * Create new entry in database
   *
   * @param {object} options? - Optional instructions for creating a new POG entry
   *
   * @returns {promise|object} - Promise resolves with new POG. Rejects with error message.
   */
  async create(options={}) {

    const data = {};
    data.pog_id = this.pog.id;

    // Check for nonPOG flag
    if (options.nonPOG) {
      data.nonPOG = true;
    }

    // Optional Analysis settings that can be passed in
    if (options.name) data.name = options.name;
    if (options.clinical_biopsy) data.clinical_biopsy = options.clinical_biopsy;
    if (options.analysis_biopsy) data.analysis_biopsy = options.analysis_biopsy;
    if (options.priority) data.priority = options.priority;
    if (options.disease) data.disease = options.disease;
    if (options.biopsy_notes) data.biopsy_notes = options.biopsy_notes;
    if (options.libraries) data.libraries = options.libraries;
    if (options.bioapps_source_id) data.bioapps_source_id = options.bioapps_source_id;
    if (options.physician) data.physician = options.physician;
    if (options.pediatric_id) data.pediatric_id = options.pediatric_id;

    this.instance = await this.model.create(data);
    return this.instance;
  }
}

module.exports = {
  POG,
}
