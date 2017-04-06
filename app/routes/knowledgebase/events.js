"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl');


router.route('/')
  .get((req,res) => {

    let opts = {};
    opts.limit = (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100;
    opts.offset = (req.query.offset) ? req.query.offset : 0;

    opts.attributes = {
      exclude: ['deletedAt', 'createdBy_id', 'reviewedBy_id']
    };
    opts.include = [
      {model: db.models.user, as: 'createdBy',  attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ];

    db.models.kb_event.findAll(opts).then(
      (result) => {
        res.json(result);
      },
      (err) => {
        console.log('SQL Error', err);
        res.status(500).json({error: {message: 'An internal error prevented the API from returning the results. Please try again. If it continues to fail please contact us.'}});
      }
    )

  })
  .post((req,res) => {

  });
router.route('/{ident}')
  .put((req,res) => {
    // Update Entry

  });

module.exports = router;