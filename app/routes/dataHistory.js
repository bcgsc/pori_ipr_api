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
  .get((req,res,next) => {
    db.models.POGDataHistory.findAll({where: {pog_id: req.POG.id}, attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']}, order: '"createdAt" DESC', include: [
      {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}}
    ]}).then(
      (histories) => {
        res.json(histories);
      },
      (err) => {
        console.log('SQL ERROR', err);
        res.status(500).json({error: {message: 'Unable to query the data history entries for this POG', code: 'failedGetPOGDataHistoryquery'}});
      }
    )
  });

router.route('/revert/:history([A-z0-9-]{36})')
  // Reverse a history entry
  .get((req,res,next) => {

    let history = new historyManager(req.params.history);

    // Revert
    history.revert(req.user, 'Lets try this').then(
      (result) => {

        // Make nice
        db.models.POGDataHistory.findOne({where: {ident: result.data.ident}, attributes: {exclude: ['id', 'pog_id', 'user_id', 'table']}, order: '"createdAt" DESC', include: [
          {as: 'user', model: db.models.user, attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'deletedAt']}}
        ]}).then(
          (history) => {
            res.json(history);
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

module.exports = router;
