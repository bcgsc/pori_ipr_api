const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');
const db = require('../../../models');
const logger = require('../../../log');

const router = express.Router({mergeParams: true});

// Register middleware

// Route for getting an image
router.route('/retrieve/:key')
  .get(async (req, res) => {
    let keys = [];

    if (!req.params.key.includes(',')) {
      keys.push(req.params.key);
    } else {
      keys = req.params.key.split(',');
    }

    const opts = {
      where: {
        key: {
          [Op.in]: keys,
        },
        report_id: req.report.id,
      },
      attributes: {exclude: ['id', 'deletedAt', 'report_id']},
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

router.route('/expression-density-graphs')
  .get(async (req, res) => {
    try {
      const output = {};
      const results = await db.models.imageData.findAll({
        where: {
          report_id: req.report.id,
          key: {
            [Op.like]: 'expDensity.%',
          },
        },
        order: [['key', 'ASC']],
        attributes: {exclude: ['id', 'deletedAt']},
      });

      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

router.route('/mutation-summary')
  .get(async (req, res) => {
    const opts = {
      where: {
        report_id: req.report.id,
        key: {
          [Op.or]: [
            {[Op.like]: 'mutation_summary.%'},
            {[Op.like]: 'mutSummary.%'},
          ],
        },
      },
      order: [['key', 'ASC']],
      attributes: {exclude: ['id', 'deletedAt', 'report_id']},
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

router.route('/subtype-plots')
  .get(async (req, res) => {
    try {
      const output = {};
      const results = await db.models.imageData.findAll({
        where: {
          report_id: req.report.id,
          key: {
            [Op.like]: 'subtypePlot.%',
          },
        },
        order: [['key', 'ASC']],
        attributes: {exclude: ['id', 'deletedAt']},
      });

      results.forEach((value) => {
        output[value.key] = value;
      });

      return res.json(output);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query image data', code: 'imageQueryFailed'}});
    }
  });

module.exports = router;
