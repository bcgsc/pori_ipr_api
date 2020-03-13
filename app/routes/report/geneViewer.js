const {Op} = require('sequelize');
const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models/');
const reportMiddleware = require('../../middleware/analysis_report');
const logger = require('../../log');

const router = express.Router({mergeParams: true});


class GeneViewer {
  /**
   * Constructor
   *
   * @param {object} report - Report ident
   * @param {string} gene - Gene symbol to search for
   *
   */
  constructor(report, gene) {
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
      this._getExpDensityGraph(),
    ];

    try {
      const [kbMatches, smallMutations, copyNumber,
        expRNA, expDensityGraph] = await Promise.all(promises);

      return {
        kbMatches,
        smallMutations,
        copyNumber,
        structuralVariants: [],
        expRNA,
        expProtein: [],
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
        reportId: this.report.id,
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
        reportId: this.report.id,
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
        reportId: this.report.id,
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
        reportId: this.report.id,
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
        reportId: this.report.id,
      },
    };

    return db.models.outlier.scope('public').findAll(opts);
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
        reportId: this.report.id,
      },
    };

    return db.models.imageData.findAll(opts);
  }
}


router.param('report', reportMiddleware);

router.get('/:geneName', async (req, res) => {
  const viewer = new GeneViewer(req.report, req.params.geneName);

  try {
    const result = await viewer.getAll();
    return res.json(result);
  } catch (error) {
    logger.error(`There was an error when getting the viewer results ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error when getting the viewer results'}});
  }
});

module.exports = router;
