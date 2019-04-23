
const express = require('express');
const db = require('../models');
const HistoryManager = require('../libs/historyManager');
const pogHandler = require('../middleware/pog');
const logger = require('../../lib/log');

const router = express.Router({mergeParams: true});

// Register middleware
router.param('POG', pogHandler);

router.route('/')
  // Get All POG History Entries
  .get(async (req, res) => {
    try {
      const results = await db.models.pog_analysis_reports_history.findAll({
        where: {pog_id: req.POG.id, pog_report_id: req.report.id},
        attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']},
        order: [['createdAt', 'DESC']],
        include: [
          {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}},
          {as: 'tags', model: db.models.history_tag, attributes: {exclude: ['id', 'pog_id', 'history_id', 'user_id']}},
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`SQL ERROR ${error}`);
      return res.status(500).json({error: {message: 'Unable to query the data history entries for this POG', code: 'failedGetPOGDataHistoryquery'}});
    }
  });

router.route('/detail/:history([A-z0-9-]{36})')
  .get(async (req, res) => {
    const history = new HistoryManager(req.params.history);

    try {
      const results = await history.detail();
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get version details ${error}`);
      return res.status(500).json(error);
    }
  });


router.route('/revert/:history([A-z0-9-]{36})')
  // Reverse a history entry
  .put(async (req, res) => {
    const history = new HistoryManager(req.params.history);

    try {
      // Revert
      const revHistory = await history.revert(req.user, req.body.comment);

      const result = await db.models.pog_analysis_reports_history.findAll({
        where: {ident: revHistory.data.ident},
        attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']},
        order: [['createdAt', 'DESC']],
        include:
        [
          {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}},
          {as: 'tags', model: db.models.history_tag, attributes: {exclude: ['id', 'pog_id', 'history_id', 'user_id']}},
        ],
      });
      return res.json(result.shift());
    } catch (error) {
      logger.error(error);
      return res.status(500).json(error);
    }
  });

router.route('/restore/:history([A-z0-9-]{36})')
  .put(async (req, res) => {
    const history = new HistoryManager(req.params.history);

    try {
      const result = await history.restore();
      if (result) {
        return res.status(204).send();
      }
      return res.status(500).json({error: {message: 'Unable to restore history'}});
    } catch (error) {
      logger.error(`Unable to get version details ${error}`);
      return res.status(500).json(error);
    }
  });

router.route('/tag/:ident([A-z0-9-]{36})?')
  .post(async (req, res) => {
    let opts;
    // Create a tag on the latest change or on a specific entry
    if (!req.params.ident) {
      opts = {where: {pog_id: req.POG.id, pog_report_id: req.report.id}, order: [['createdAt', 'DESC']]};
    } else {
      opts = {where: {pog_id: req.POG.id, ident: req.params.ident}};
    }

    try {
      const history = await db.models.pog_analysis_reports_history.findOne(opts);
      // Create tag entry
      const tag = await db.models.history_tag.create({
        pog_id: req.POG.id,
        pog_report_id: req.report.id,
        history_id: history.id,
        user_id: req.user.id,
        tag: req.body.tag,
      });
      return res.status(201).json({tag: tag.tag, ident: tag.ident, createdAt: tag.createdAt});
    } catch (error) {
      logger.error(error);
      return res.status(500).json(error);
    }
  })
  // Delete a tag
  .delete(async (req, res) => {
    try {
      const result = await db.models.history_tag.destroy({where: {ident: req.params.ident}, limit: 1});
      if (result === 1) {
        return res.status(204).send();
      }
      return res.status(404).json({error: {message: 'Unable to find the tag to remove.', code: 'failedDestroyHistoryTagQuery'}});
    } catch (error) {
      logger.error(`Unable to destroy history tag ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove the tag.', code: 'failedDestroyHistoryTagQuery'}});
    }
  })
  // Get All Tags (or one)
  .get(async (req, res) => {
    const opts = {where: {pog_id: req.POG.id}, order: [['tag', 'DESC']], attributes: {exclude: ['id', 'user_id', 'history_id', 'pog_id']}};
    // Create a tag on the latest change or on a specific entry
    if (req.params.ident) {
      opts.where.ident = req.params.ident;
    }

    try {
      let results = await db.models.history_tag.findAll(opts);
      if (results.length === 1) {
        results = results.shift();
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to destroy history tag ${error}`);
      return res.status(404).json({error: {message: 'Unable to get the tag(s).', code: 'failedGetistoryTagQuery'}});
    }
  });


router.route('/tag/search/:query')
  .get(async (req, res) => {
    const opts = {
      attributes: {exclude: ['id', 'pog_id', 'user_id', 'history_id', 'ident', 'createdAt']},
      group: 'tag',
      where: {$or: [{tag: {$ilike: `%${req.params.query}%`}}]},
    };

    try {
      // Search for Tags
      const results = await db.models.history_tag.findAll(opts);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to search tags ${error}`);
      return res.status(404).json({error: {message: 'Unable to search tags.', code: 'failedSearchHistoryTagQuery'}});
    }
  });

module.exports = router;
