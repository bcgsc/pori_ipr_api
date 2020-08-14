const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.comparators.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup comparators for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the comparators for ${req.report.ident}`}});
    }
  });

module.exports = router;
