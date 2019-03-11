const express = require('express');
const db = require('../../../models');

const router = express.Router({mergeParams: true});
const {logger} = process;

// Register middleware

// Route for getting an image
router.route('/retrieve/:key')
  .get(async (req, res) => {
    let keys = [];
    // Get All Pogs
    if (!req.params.key.includes(',')) {
      keys.push(req.params.key);
    } else {
      keys = req.params.key.split(',');
    }

    const opts = {
      where: {
        key: {
          in: keys,
        },
        pog_report_id: req.report.id,
      },
      attributes: {exclude: ['id', 'deletedAt', 'pog_id', 'pog_report_id']},
    };

    try {
      const results = await db.models.imageData.findAll(opts);
      const output = {};

      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(`There was an error finding image data ${error}`);
      return res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  })
  .put(() => {
    // Add a new Potential Clinical Alteration...
    const error = new Error('The put call isn\'t implemented for this route');
    logger.error(error);
    throw error;
  });

router.route('/expressionDensityGraphs')
  .get(async (req, res) => {
    try {
      const output = {};
      const results = await db.models.imageData.findAll({
        where: {
          pog_id: req.POG.id,
          pog_report_id: req.report.id,
          key: {
            $like: 'expDensity.%',
          },
        },
        order: [['key', 'ASC']],
        attributes: {exclude: ['id', 'deletedAt', 'pog_id']},
      });

      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

router.route('/mutationSummary')
  .get(async (req, res) => {
    const opts = {
      where: {
        pog_report_id: req.report.id,
        key: {
          $or: [
            {$like: 'mutation_summary.%'},
            {$like: 'mutSummary.%'},
          ],
        },
      },
      order: [['key', 'ASC']],
      attributes: {exclude: ['id', 'deletedAt', 'pog_id', 'pog_report_id']},
    };

    try {
      const output = {};
      const results = await db.models.imageData.findAll(opts);
      results.forEach((value) => {
        output[value.key] = value;
      });
      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

router.route('/subtypePlots')
  .get(async (req, res) => {
    try {
      const output = {};
      const results = await db.models.imageData.findAll({
        where: {
          pog_id: req.POG.id,
          pog_report_id: req.report.id,
          key: {
            $like: 'subtypePlot.%',
          },
        },
        order: [['key', 'ASC']],
        attributes: {exclude: ['id', 'deletedAt', 'pog_id']},
      });

      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

module.exports = router;
