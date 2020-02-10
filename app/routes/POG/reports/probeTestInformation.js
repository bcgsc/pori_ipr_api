const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../models');
const logger = require('../../../log');

const router = express.Router({mergeParams: true});

// Routing for event
router.route('/')
  .get(async (req, res) => {
    try {
      // Get all rows for this POG
      const result = await db.models.probe_test_information.scope('public').findOne({where: {reportId: req.report.id}});
      return res.json(result);
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'}});
    }
  });

module.exports = router;
