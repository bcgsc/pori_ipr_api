const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

// Get all report mavis summaries
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.mavis.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get mavis summaries ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get mavis summaries'},
      });
    }
  });

module.exports = router;
