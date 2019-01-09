"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations'),
  historyManager = require(process.cwd() + '/app/libs/historyManager');


// Register middleware
router.param('POG', require(process.cwd() + '/app/middleware/pog'));

router.route('/')
  // Get All POG History Entries
  .get((req, res, next) => {
    db.models.pog_analysis_reports_history.findAll({
      where: {pog_id: req.POG.id, pog_report_id: req.report.id},
      attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']},
      order: [['createdAt', 'DESC']],
      include: [
        {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}},
        {as: 'tags', model: db.models.history_tag, attributes: {exclude: ['id', 'pog_id', 'history_id', 'user_id']}},
      ],
    }).then(
      (histories) => {
        res.json(histories);
      },
      (err) => {
        console.log('SQL ERROR', err);
        res.status(500).json({error: {message: 'Unable to query the data history entries for this POG', code: 'failedGetPOGDataHistoryquery'}});
      }
    );
  });

router.route('/detail/:history([A-z0-9-]{36})')
  .get((req,res,next) => {
    let history = new historyManager(req.params.history);

    history.detail().then(
      (versions) => {
        res.json(versions);
      },
      (err) => {
        console.log('Unable to get version details', err);
        res.status(500).json(err);
      }
    )
  });

router.route('/revert/:history([A-z0-9-]{36})')
  // Reverse a history entry
  .put((req,res,next) => {

    let history = new historyManager(req.params.history);

    // Revert
    history.revert(req.user, req.body.comment).then(
      (result) => {
        // Make nice
        db.models.pog_analysis_reports_history.findAll({
          where: {ident: result.data.ident},
          attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']},
          order: [['createdAt', 'DESC']],
          include:
          [
            {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}},
            {as: 'tags', model: db.models.history_tag, attributes: {exclude: ['id', 'pog_id', 'history_id', 'user_id']}},
          ],
        }).then(
          (history) => {
            res.json(history[0]);
          },
          (err) => {
            console.log('SQL ERROR', err);
            res.status(500).json({error: {message: 'Unable to query the data history entries for this POG', code: 'failedGetPOGDataHistoryquery'}});
          }
        );

      },
      (err) => {
        console.log('Data History revert error', err);
        res.status(500).json(err);
      }
    );

  });

router.route('/restore/:history([A-z0-9-]{36})')
  .put((req,res,next) => {
    let history = new historyManager(req.params.history);

    history.restore().then(
      (response) => {
        if(response) res.status(204).send();
      },
      (err) => {
        console.log('Unable to get version details', err);
        res.status(500).json(err);
      }
    )
  });

router.route('/tag/:ident([A-z0-9-]{36})?')
  // Add tag to history
  .post((req, res, next) => {
    let opts;
    // Create a tag on the latest change or on a specific entry
    if (!req.params.ident) opts = {where: {pog_id: req.POG.id, pog_report_id: req.report.id}, order: [['createdAt', 'DESC']]};
    if (req.params.ident) opts = {where: {pog_id: req.POG.id, ident: req.params.ident}};

    db.models.pog_analysis_reports_history.findOne(opts).then(
      (history) => {
        // Create tag entry
        db.models.history_tag.create({
          pog_id: req.POG.id,
          pog_report_id: req.report.id,
          history_id: history.id,
          user_id: req.user.id,
          tag: req.body.tag,
        }).then(
          (tag) => {
            res.json({tag: tag.tag, ident: tag.ident, "createdAt": tag.createdAt});
          },
          (err) => {
            console.log('Unable to create history tag', err);
            res.status(500).json({error: {message: 'Unable to tag history entry.', code: 'failedCreateHistoryTagInsert'}});
          }
        );
      },
      (err) => {
        console.log('Unable to get latest history', err);
        res.status(500).json({error: {message: 'Unable to tag history entry.', code: 'failedGetLatestHistoryQuery'}});
      }
    );

  })
  // Delete a tag
  .delete((req,res,next) => {

    // Destroy!
    db.models.history_tag.destroy({where: {ident: req.params.ident}, limit: 1}).then(
      (result) => {
        if(result === 1) res.status(204).send();
        if(result !== 1) res.status(404).json({error: {message: 'Unable to find the tag to remove.', code: 'failedDestroyHistoryTagQuery'}});
      },
      (err) => {
        console.log('Unable to destroy history tag', err);
        res.status(404).json({error: {message: 'Unable to remove the tag.', code: 'failedDestroyHistoryTagQuery'}});
      }
    );
  })
  // Get All Tags (or one)
  .get((req,res,next) => {

    let opts = {where: {pog_id: req.POG.id}, order: [['tag', 'DESC']], attributes: {exclude: ['id', 'user_id', 'history_id', 'pog_id']}};
    // Create a tag on the latest change or on a specific entry
    if(req.params.ident) opts.where.ident = req.params.ident;

    db.models.history_tag.findAll(opts).then(
      (tags) => {
        if(tags.length === 1) tags = tags[0];

        res.json(tags);
      },
      (err) => {
        console.log('Unable to destroy history tag', err);
        res.status(404).json({error: {message: 'Unable to get the tag(s).', code: 'failedGetistoryTagQuery'}});
      }
    )
  });


router.route('/tag/search/:query')
  .get((req,res,next) => {

    let opts = {
      attributes: {exclude: ['id', 'pog_id', 'user_id', 'history_id', 'ident', 'createdAt']},
      group: 'tag',
      where: {
        $or: [
          {tag: {$ilike: '%' + req.params.query + '%'}}
        ]
      }
    };

    // Search for Tags
    db.models.history_tag.findAll(opts).then(
      (tags) => {
        res.json(tags);
      },
      (err) => {
        console.log('Unable to search tags', err);
        res.status(404).json({error: {message: 'Unable to search tags.', code: 'failedSearchHistoryTagQuery'}});
      }
    )

  });

module.exports = router;
