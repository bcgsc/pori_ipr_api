const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

// Get all report mavis summaries
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/mavis`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for mavis data ${error}`);
    }

    try {
      const results = await db.models.mavis.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 5400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get mavis summaries ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get mavis summaries'},
      });
    }
  });

module.exports = router;
