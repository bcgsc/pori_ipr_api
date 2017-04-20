"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  kbVersion = require(process.cwd() +  '/app/libs/kbVersionDatum.js');



router.param('event', (req,res,next,event) => {

  let opts = {};
  opts.attributes = {
    exclude: ['id', 'deletedAt', 'createdBy_id', 'reviewedBy_id']
  };

  opts.include = [
    {model: db.models.user, as: 'createdBy',  attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
  ];

  opts.where = {ident: event};

  db.models.kb_event.findOne(opts).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareKBEventLookup'} });
      req.event = result;
      next();
    },
    (error) => {
      console.log(error);
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareKBEventQuery'} });
    }
  );
});

router.route('/')
  .get((req,res) => {

    let opts = {};
    opts.limit = (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100;
    opts.offset = (req.query.offset) ? req.query.offset : 0;

    opts.attributes = {
      exclude: ['deletedAt', 'createdBy_id', 'reviewedBy_id']
    };

    let where = eventQueryFilter(req);
    if(where !== null) opts.where = where;

    opts.include = [
      {model: db.models.user, as: 'createdBy',  attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ];

    //return res.json(opts.where);

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
    // Add new event

    // Validation!!

    req.body.createdBy_id = req.user.id;
    req.body.status = 'NEW';

    // Create new events entry
    db.models.kb_event.create(req.body).then(
      (event) => {

        // History Entry
        let createHistory = {
          type: 'create',
          table: db.models.kb_event.getTableName(),
          model: db.models.kb_event.name,
          entry: event.ident,
          previous: null,
          new: 0,
          user_id: req.user.id,
          comment: req.body.comments
        };

        // Create history entry
        db.models.kb_history.create(createHistory).then(
          (history) => {

            // Construct response object
            event = event.get();
            event.history = [history];
            event.createdBy = {firstName: req.user.firstName, lastName: req.user.lastName, ident: req.user.ident};

            // Return new object
            res.status(201).json(event);
          },
          (error) => {
            res.status(500).json({error: {message: 'Unable to create the new events history entry', code: 'failedHistoryCreateQuery'}});
          }
        )
      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to create the new events entry', code: 'failedEventCreateQuery'}});
      }
    )
  });

router.route('/count')
  // Get count of events
  .get((req, res) => {
    let opts = {};

    let where = eventQueryFilter(req);
    if(where !== null) opts.where = where;

    db.models.kb_event.count(opts).then(
      (result) => {
        res.json({events: result});
      }
    )
  });

router.route('/:event([A-z0-9-]{36})')
  // Get event
  .get((req,res) => {

    // Return event
    res.json(req.event);

  })
  // Update event
  .put((req,res) => {
    // Update Entry
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.approvedAt;

    req.body.status = 'REQUIRES-REVIEW';
    req.body.createdBy_id = req.user.id;
    req.body.dataVersion = req.event.dataVersion + 1;

    // Version the data
    kbVersion(db.models.kb_event, req.event, req.body, req.user, req.body.comments).then(
      (result) => {

        let event = result.data.create.get();
        let history = result.data.history;
        event.history = [history];

        // Return new object
        res.status(200).json(event);

      },
      (err) => {
        console.log(err);
        res.status(500).json('Unable to version the data');
      }
    );

  });



/**
 * Build where clause for searching events
 *
 * @param {object} req - Request object
 * @returns {object} - Returns where object ready to be parsed by SequelizeJS ORM
 */
let eventQueryFilter = (req) => {

  let where = null;

  // Allow filters, and their query settings
  const allowedFilters = {
    'key': {operator: "$or", each: '$ilike', wrap: true},
    'type': {operator: "$in", each: null, wrap: false},
    'name': {operator: "$or", each: "$ilike", wrap: true},
    'display_coord': {operator: "$or", each: "$ilike", wrap: true},
    'notation': {operator: "$or", each: "$ilike", wrap: true},
    'related_events': {operator: "$or", each: "$ilike", wrap: true},
    'subtype': {operator: '$in', each: null, wrap: false},
    'description': {operator: '$or', each: '$ilike', wrap: true},
    'status': {operator: '$or', each: '$ilike', wrap: true}
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

  // Search clause sent?
  if(req.query.search) {
    // Make a search query
    if(where === null) where = {$and: []};

    let query = req.query.search;

    let searchClause = { $or: [] };
    searchClause.$or.push({ key: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ name: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ display_coord: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ notation: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ related_events: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ subtype: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ description: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ status: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ comments: { $ilike: '%' + query + '%' }});

    where.$and.push(searchClause);
  }

  return where;
};

module.exports = router;