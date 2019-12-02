const db = require('../../models');
const Analysis = require('../../modules/analysis/analysis.object');

class POG {
  /**
   * Construct POG
   *
   * @param {string} POGID - Pog ID
   */
  constructor(POGID) {
    this.POGID = POGID;
    this.instance = null;
    this.model = db.models.POG;
  }

  /**
   * Retrieve entry from database
   *
   * @param {object} options - Optional args (nonPOG, type, analysis)
   * @returns {Promise.<object>} - Returns a database instance of model
   */
  async retrieve(options = {}) {
    // Return cached object
    if (this.instance) {
      return this.instance;
    }

    // Lookup in Database
    const pog = await this.model.findOne({where: {POGID: this.POGID}, include: {as: 'analysis', model: db.models.pog_analysis}});

    // Not found, and asked to create
    if (!pog) {
      if (options.create) {
        const createOpts = {};
        if (options.nonPOG) {
          createOpts.nonPOG = true;
          createOpts.type = 'genomic';
        }
        createOpts.analysis = (options.analysis !== undefined) ? options.analysis : true;

        // Run create
        this.instance = await this.create(createOpts);
        return this.instance;
      }
      // POG not found
      return null;
    }

    this.instance = pog;
    return this.instance;
  }


  /**
   * Create new entry in database
   *
   * @param {object} options? - Optional instructions for creating a new POG entry
   * @returns {Promise.<object>} - Returns new POG
   */
  async create(options = {}) {
    const data = {POGID: this.POGID};

    // Check for nonPOG flag
    if (options.nonPOG) {
      data.nonPOG = true;
    }
    const pog = await this.model.create(data);
    this.instance = pog;

    if (options.analysis) {
      const analysis = new Analysis(null, true);
      pog.analysis = await analysis.create(pog, options.analysis);
    }

    return pog;
  }
}

module.exports = POG;
