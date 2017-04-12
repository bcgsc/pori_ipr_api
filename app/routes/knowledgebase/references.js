"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl');


router.route('/')
  .get((req,res) => {

    // Query Options
    let opts = {};
    opts.limit = (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100;
    opts.offset = (req.query.offset) ? req.query.offset : 0;

    let where = referenceQueryFilter(req);
    if(where !== null) opts.where = where;

    //return res.json(opts.where);;

    opts.attributes = {
      exclude: ['deletedAt', 'createdBy_id', 'reviewedBy_id']
    };
    opts.include = [
      {model: db.models.user, as: 'createdBy',  attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ];

    db.models.kb_reference.findAll(opts).then(
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
router.route('/count')
  .get((req,res) => {

    let opts = {};

    let where = referenceQueryFilter(req);
    if(where !== null) opts.where = where;

    db.models.kb_reference.count(opts).then(
      (result) => {
        res.json({references: result});
      }
    )

  });
router.route('/{ident}')
  .put((req,res) => {
    // Update Entry

  });

/**
 * Build where clause for searching references
 *
 * @param {object} req - Request object
 * @returns {object} - Returns where object ready to be parsed by SequelizeJS ORM
 */
let referenceQueryFilter = (req) => {

  let where = null;

  // Allow filters, and their query settings
  const allowedFilters = {
    'type': {operator: "$in", each: null, wrap: false},
    'relevance': {operator: "$in", each: null}, wrap: false,
    'disease_list': {operator: "$or", each: "$ilike", wrap: true},
    'context': {operator: "$or", each: "$ilike", wrap: true},
    'evidence': {operator: "$in", each: null, wrap: false},
    'status': {operator: "$in", each: null, wrap: false},
    'events_expression': {operator: '$or', each: '$ilike', wrap: true}
  };

  // Are we building a where clause?
  if(_.intersection(_.keysIn(req.query), _.keysIn(allowedFilters)).length > 0) {

    where = { '$and': [] };

    // Which filters, from the allowed list, have been sent?
    let filters = _.chain(req.query).keysIn().intersection(_.keysIn(allowedFilters)).value();


    // Loop over filters and build them into the ORM clause
    _.forEach(filters, (filter) => {

      // Split the filter values into arrays
      let values = req.query[filter].split(',');

      // Loop over each value and setup the query syntax
      values.forEach((v, i, arr) => {
        if(allowedFilters[filter].each) {
          arr[i] = {}; // Make collection entry
          arr[i][allowedFilters[filter].each] = (allowedFilters[filter].wrap) ? '%'+v+'%' : v;
        }
      });

      // Build where clause
      let clause = {};
      clause[filter] = {};
      clause[filter][allowedFilters[filter].operator] = values;

      // Add to required (and) clauses
      where['$and'].push(clause);

    });

  }

  return where;
};

module.exports = router;