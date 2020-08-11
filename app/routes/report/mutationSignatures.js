const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all mutation signatures for this report
    const filters = {reportId: req.report.id};
    if (req.query.selected !== undefined) {
      filters.selected = req.query.selected;
    }
    consolelog('filters', filters);
    try {
      const results = await db.models.mutationSignature.scope('public').findAll({
        where: filters,
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve mutation signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve mutation signatures'}});
    }
  });


module.exports = router;
