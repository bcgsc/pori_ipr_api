const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});


router.route('/')
  .get(async (req, res) => {
    try {
      const result = await db.models.probe_test_information.scope('public').findOne({
        where: {reportId: req.report.id},
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to get probe test information ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get probe test information'},
      });
    }
  });

module.exports = router;
