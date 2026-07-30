const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../models');
const logger = require('../log');

const router = express.Router({mergeParams: true});

// Get all therapeutic targets across all reports (admin only, enforced in ACL middleware)
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.therapeuticTarget.scope('public').findAll({
        order: [['rank', 'ASC']],
        include: [
          {
            model: db.models.report,
            as: 'report',
            attributes: ['ident'],
          },
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve therapeutic targets ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve therapeutic targets'}});
    }
  });

module.exports = router;
