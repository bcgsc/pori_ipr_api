const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {reportId: req.report.id},
    };

    // Get all small mutations for this report
    try {
      const results = await db.models.mutationSignature.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve mutation signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve mutation signatures'}});
    }
  });


module.exports = router;
