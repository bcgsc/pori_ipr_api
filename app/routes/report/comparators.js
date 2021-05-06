const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const router = express.Router({mergeParams: true});

router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/comparators`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for comparators ${error}`);
    }

    try {
      const results = await db.models.comparators.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 5400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup comparators for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: `Unable to lookup the comparators for ${req.report.ident}`},
      });
    }
  });

module.exports = router;
