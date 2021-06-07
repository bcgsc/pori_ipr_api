const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

router.route('/')
  .get(async (req, res) => {
    try {
      const settings = await db.models.userMetadata.findOne({
        where: {user_id: req.user.id}, attributes: ['settings'],
      });
      return res.json(settings);
    } catch (error) {
      logger.error(`Unable to find user settings for ${req.user.username} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to find user settings'},
      });
    }
  })
  .put(async (req, res) => {
    try {
      await db.models.userMetadata.update({settings: req.body}, {
        where: {
          user_id: req.user.id,
        },
        fields: ['settings'],
        hooks: false,
        limit: 1,
      });
      return res.json(req.body);
    } catch (error) {
      logger.error(`Unable to update user settings ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update user settings'},
      });
    }
  });

module.exports = router;
