const {Op} = require('sequelize');
const db = require('../../models');

class Analysis {
  /**
   * Patient Analysis constructor
   *
   * @param {object} init - Optional initial value
   * @param {boolean} newEntry - Creating a new entry
   */
  constructor(init = undefined, newEntry = false) {
    if (!init && !newEntry) {
      throw new Error('Existing patient analysis model object is required if not creating a new entry');
    }
    this.instance = init;
    this.model = db.models.pog_analysis;
  }

  /**
   * Create new Patient Analysis entry
   *
   * @param {object} pog - SequelizeJS Model POG object
   * @param {object} options - Hashmap of analysis attributes
   *
   * @returns {Promise.<object>} - Returns an instance of the created analysis object
   */
  async create(pog, options) {
    const data = {};

    if (!pog.id) {
      throw new Error('Invalid POG object passed to analysis create');
    }

    data.pog_id = pog.id;

    // Check for nonPOG flag
    if (options.nonPOG) data.nonPOG = true;

    // Optional Analysis settings that can be passed in
    if (options.name) {
      data.name = options.name;
    }
    if (options.clinical_biopsy) {
      data.clinical_biopsy = options.clinical_biopsy;
    }
    if (options.analysis_biopsy) {
      data.analysis_biopsy = options.analysis_biopsy;
    }
    if (options.priority) {
      data.priority = options.priority;
    }
    if (options.disease) {
      data.disease = options.disease;
    }
    if (options.biopsy_notes) {
      data.biopsy_notes = options.biopsy_notes;
    }
    if (options.libraries) {
      data.libraries = options.libraries;
    }
    if (options.bioapps_source_id) {
      data.bioapps_source_id = options.bioapps_source_id;
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

    const analysis = await this.model.create(data);

    this.instance = analysis;
    return this.getPublic();
  }

  /**
   * Retrieve or create biopsy analysis record
   *
   * @param {integer} pogId - Internal pog_id identifier
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
  static async retrieveOrCreate(pogId, options = {}) {
    if (!pogId) {
      throw new Error('pogId is required');
    }

    // Create data object
    const data = {};
    const availableOptions = [];

    // If Biopsy is specified
    if (options.analysis_biopsy) {
      availableOptions.push({
        pog_id: pogId,
        analysis_biopsy: options.analysis_biopsy,
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
    if (options.analysis_biopsy) {
      data.analysis_biopsy = options.analysis_biopsy;
    }
    if (options.libraries) {
      data.libraries = options.libraries;
    }

    const [result] = await db.models.pog_analysis.findOrCreate({where, defaults: data});
    return result;
  }

  /**
   * Update values on analysis
   *
   * @param {object} data - The values to update the instance with
   *
   * @returns {Promise.<object>} - Returns a public instance of the model
   */
  async update(data) {
    // Update Payload
    const update = {libraries: {}};

    // Fields that can be updated
    if (data.name) {
      update.name = this.instance.name = data.name;
    }
    if (data.clinical_biopsy) {
      update.clinical_biopsy = this.instance.clinical_biopsy = data.clinical_biopsy;
    }
    if (data.analysis_biopsy) {
      update.analysis_biopsy = this.instance.analysis_biopsy = data.analysis_biopsy;
    }
    if (data.priority) {
      update.priority = this.instance.priority = data.priority;
    }
    if (data.disease) {
      update.disease = this.instance.disease = data.disease;
    }
    if (data.biopsy_notes) {
      update.biopsy_notes = this.instance.biopsy_notes = data.biopsy_notes;
    }

    if (data.libraries) {
      if (data.libraries.normal) {
        update.libraries.normal = this.instance.libraries.normal = data.libraries.normal;
      }
      if (data.libraries.tumour) {
        update.libraries.tumour = this.instance.libraries.tumour = data.libraries.tumour;
      }
      if (data.libraries.transcriptome) {
        update.libraries.transcriptome = this.instance.libraries.transcriptome = data.libraries.transcriptome;
      }
    }

    if (data.bioapps_source_id) {
      update.bioapps_source_id = this.instance.bioapps_source_id = data.bioapps_source_id;
    }
    if (data.biopsy_date) {
      update.biopsy_date = this.instance.biopsy_date = data.biopsy_date;
    }
    if (data.threeLetterCode) {
      update.threeLetterCode = this.instance.threeLetterCode = data.threeLetterCode;
    }

    if (data.physician) {
      update.physician = this.instance.physician = data.physician;
    }
    if (data.pediatric_id) {
      update.pediatric_id = this.instance.pediatric_id = data.pediatric_id;
    }

    await this.model.update(data, {where: {ident: this.instance.ident}});
    return this.getPublic();
  }

  /**
   * Get public version of this instance
   *
   * @returns {Promise.<object>} - Returns a public instance of the model
   */
  async getPublic() {
    const opts = {
      where: {
        ident: this.instance.ident,
      },
      attributes: {
        exclude: ['deletedAt'],
      },
    };

    // Lookup POG first
    const publicInstance = await this.model.scope('public').findOne(opts);

    if (!publicInstance) {
      throw new Error('Unable to find the requested analysis');
    }
    return publicInstance;
  }
}

module.exports = Analysis;
