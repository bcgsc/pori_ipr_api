const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    // Get all targeted genes for this report
    try {
      const result = await db.models.probeResults.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'}});
    }
  });

module.exports = router;
