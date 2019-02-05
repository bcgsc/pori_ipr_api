const db = require('../../../app/models');

class POG {
  /**
   * Construct POG
   *
   * @param POGID
   */
  constructor(POGID) {
    this.POGID = POGID; // Store POGID
    this.instance = null;
    this.model = db.models.POG;
  }
  /**
   * Retrieve entry from database
   *
   * @param {object} options - Optional args (nonPOG, type, analysis)
   *
   * @returns {promise|object} - Resolves with database instance of model
   */
  async retrieve(options = {}) {
    // Return cached object
    if (this.instance) {
      return this.instance;
    }

    // Lookup in Database
    const POG = await this.model.findOne({ where: {POGID: this.POGID }, include: {as: 'analysis', model: db.models.pog_analysis }});

    // Not found, and asked to create
    if(POG === null && options.create) {

      const createOpts = {};
      if(options.nonPOG) {
        createOpts.nonPOG = true;
        createOpts.type = 'genomic';
        createOpts.project = options.project;
      }
            
      createOpts.analysis = (options.analysis !== undefined) ? options.analysis : true;
            
      // Run create
      this.instance = await this.create(createOpts);
      return this.instance;
    }

    // POG not found
    if(POG === null) {
      return null;
    } else {
      this.instance = POG;
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
  async create(options = {}) {

      const data = { POGID: this.POGID };

      // Check for nonPOG flag
      if(options.nonPOG) {
        data.nonPOG = true;
      }
      const POG = await this.model.create(data);
      this.instance = POG;

      const analysis = { pog_id: POG.id };

      // Optional Analysis settings that can be passed in
      if (options.analysis){
        if (options.analysis.clinical_biopsy) {
          analysis.clinical_biopsy = options.analysis.clinical_biopsy;
        }
        if (options.analysis.analysis_biopsy) {
          analysis.analysis_biopsy = options.analysis.analysis_biopsy;
        }
        if (options.analysis.priority) {
          analysis.priority = options.analysis.priority;
        }
        if (options.analysis.disease) {
          analysis.disease = options.analysis.disease;
        }
        if (options.analysis.biopsy_notes) {
          analysis.biopsy_notes = options.analysis.biopsy_notes;
        }
        if (options.analysis.libraries) {
          analysis.libraries = options.analysis.libraries;
        }
        if (options.analysis.bioapps_source_id) {
          analysis.bioapps_source_id = options.analysis.bioapps_source_id;
        }
        analysis.name = (options.analysis && options.analysis.name) ? options.analysis.name : 'N/A';

        const pogAnalysis = await db.models.pog_analysis.create(analysis);
        POG.analysis = [pogAnalysis]; // Nest analysis inside POG
      }

      return POG;
  }
}

module.exports = {
  POG,
};