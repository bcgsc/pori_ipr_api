const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.pairwiseExpressionCorrelation.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve pairwise expression correlation ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve pairwise expression correlation'},
      });
    }
  });


module.exports = router;
