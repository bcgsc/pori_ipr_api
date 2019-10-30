const {Op} = require('sequelize');
const db = require('../../models/');

const logger = require('../../log');

class GeneViewer {
  /**
   * Constructor
   *
   * @param {object} pog - POGID
   * @param {object} report - Report ident
   * @param {string} gene - Gene symbol to search for
   *
   */
  constructor(pog, report, gene) {
    this.pog = pog;
    this.report = report;
    this.gene = gene;
  }

  /**
   * Run promises and get all results
   *
   * @returns {Promise.<object>} - Returns all the results for the gene viewer
   */
  async getAll() {
    const promises = [
      this._getKbMatches(),
      this._getSmallMutations(),
      this._getCopyNumber(),
      this._getExpRNA(),
      this._getExpDrugTarget(),
      this._getExpDensityGraph(),
    ];

    try {
      const [kbMatches, smallMutations, copyNumber,
        expRNA, expDrugTarget, expDensityGraph] = await Promise.all(promises);

      return {
        kbMatches,
        smallMutations,
        copyNumber,
        structuralVariants: [],
        expRNA,
        expProtein: [],
        expDrugTarget,
        expDensityGraph,
      };
    } catch (error) {
      logger.error(`Unable to get gene viewer data ${error}`);
      throw new Error('Unable to get gene viewer data');
    }
  }

  /**
   * KB Matches
   *
   * @returns {Promise.<Array.<object>>} - Returns all the alterations for gene and report
   * @private
   */
  async _getKbMatches() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.alterations.scope('public').findAll(opts);
  }

  /**
   * Small Mutations
   *
   * @returns {Promise.<Array.<object>>} - Returns all small mutations for gene and report
   * @private
   */
  async _getSmallMutations() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.smallMutations.scope('public').findAll(opts);
  }

  /**
   * Copy Number Analyses
   *
   * @returns {Promise.<Array.<object>>} - Returns all cnv's for gene and report
   * @private
   */
  async _getCopyNumber() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.cnv.scope('public').findAll(opts);
  }

  /**
   * Structural Variants
   *
   * @returns {Promise.<Array.<object>>} - Returns all sv's for gene and report
   * @private
   */
  async _getStructuralVariants() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.sv.scope('public').findAll(opts);
  }

  /**
   * Expression - RNA
   *
   * @returns {Promise.<Array.<object>>} - Returns all outliers for gene and report
   * @private
   */
  async _getExpRNA() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.outlier.scope('public').findAll(opts);
  }

  /**
   * Expression - Protein
   *
   * @returns {Promise.<Array.<object>>} - Returns all protein expression for gene and report
   * @private
   */
  async _getExpProtein() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.proteinExpression.scope('public').findAll(opts);
  }

  /**
   * Expression - Drug Targetable
   *
   * @returns {Promise.<Array.<object>>} - Returns all drug targets for gene and report
   * @private
   */
  async _getExpDrugTarget() {
    const opts = {
      where: {
        gene: {[Op.iLike]: `%${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.drugTarget.scope('public').findAll(opts);
  }

  /**
   * Expression - Density Graph
   *
   * @returns {Promise.<Array.<object>>} - Returns all density graphs for gene and report
   * @private
   */
  async _getExpDensityGraph() {
    const opts = {
      where: {
        key: {[Op.iLike]: `%expDensity.${this.gene}%`},
        pog_report_id: this.report.id,
      },
    };

    return db.models.imageData.findAll(opts);
  }
}

module.exports = GeneViewer;
