"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  kbEvent = require(process.cwd() + '/app/libs/kbEvent'),
  kbVersion = require(process.cwd() +  '/app/libs/kbVersionDatum.js');


router.param('reference', (req,res,next,ref) => {

  let opts = {};
  opts.attributes = {
    exclude: ['id', 'deletedAt', 'createdBy_id', 'reviewedBy_id']
  };
  opts.include = [
    {model: db.models.user, as: 'createdBy',  attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
  ];
  opts.where = {ident: ref}

  db.models.kb_reference.findOne(opts).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'} });
      req.reference = result;
      next();
    },
    (error) => {
      console.log(error);
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareReferenceQuery'} });
    }
  );
});


router.route('/')
  .get((req,res) => {

    // Access Control
    let access = new acl(req, res);
    access.notGroups('Clinician', 'Collaborator');
    let externalUser = true;
    if(access.check(true)) externalUser = false;

    // Query Options
    let opts = {};
    opts.limit = (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100;
    opts.offset = (req.query.offset) ? req.query.offset : 0;

    let where = referenceQueryFilter(req);
    if(where !== null) opts.where = where;

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    let filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if(externalUser) {
      if(opts.where) {
        _.each(filterReferenceSources, function(refSource) {
          opts.where['$and'].push({ref_id: {$notILike: refSource}});
        });
      } else {
        opts.where = {'$and': []};
        _.each(filterReferenceSources, function(refSource) {
          opts.where['$and'].push({ref_id: {$notILike: refSource}});
        });
      }
    }

    //return res.json(opts.where);

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
    // Validation!!

    req.body.createdBy_id = req.user.id;
    req.body.status = 'NEW';

    // Create new references entry
    db.models.kb_reference.create(req.body).then(
      (reference) => {

        // History Entry
        let createHistory = {
          type: 'create',
          table: db.models.kb_reference.getTableName(),
          model: db.models.kb_reference.name,
          entry: reference.ident,
          previous: null,
          new: 0,
          user_id: req.user.id,
          comment: req.body.comments
        };

        // Start Event Creation loop
        _.forEach(_.split(reference.events_expression,  /\||\&/g), (item) => {
          kbEvent.eventCheck(item, req.user);
        });


        // Create history entry
        db.models.kb_history.create(createHistory).then(
          (history) => {

            // Construct response object
            reference = reference.get();
            reference.history = [history];
            reference.createdBy = {firstName: req.user.firstName, lastName: req.user.lastName, ident: req.user.ident};

            // Return new object
            res.status(201).json(reference);
          },
          (error) => {
            res.status(500).json({error: {message: 'Unable to create the new references history entry', code: 'failedHistoryCreateQuery'}});
          }

        )

      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to create the new references entry', code: 'failedReferenceCreateQuery'}});
      }
    )
  });
router.route('/count')
  .get((req,res) => {

    // Access Control
    let access = new acl(req, res);
    access.notGroups('Clinician', 'Collaborator');
    let externalUser = true;
    if(access.check(true)) externalUser = false;

    let opts = {};

    let where = referenceQueryFilter(req);
    if(where !== null) opts.where = where;

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    let filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if(externalUser) {
      if(!opts.where) opts.where = {'$and': []};

      _.each(filterReferenceSources, function(refSource) {
        opts.where['$and'].push({ref_id: {$notILike: refSource}});
      });
    }

    db.models.kb_reference.count(opts).then(
      (result) => {
        res.json({references: result});
      }
    )

  });
router.route('/:reference([A-z0-9-]{36})')
  .put((req,res, next) => {
    // Update Entry
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.approvedAt;

    req.body.status = 'REQUIRES-REVIEW';
    req.body.createdBy_id = req.user.id;
    req.body.dataVersion = req.reference.dataVersion + 1;

    // Version the data
    let promise = kbVersion(db.models.kb_reference, req.reference, req.body, req.user, req.body.comments).then(
      (result) => {

        let reference = result.data.create;
        let history = result.history;
        let data = result.data.create.get();

        // Return new object
        res.status(200).json(reference);

        // Send response
        res.json(data);
      },
      (err) => {
        console.log(err);
        res.status(500).json('Unable to version the data');
      }
    );

  })
  .get((req,res,next) => {

    res.json(req.reference);

  });

// Update Route Status
router.route('/:reference([A-z0-9-]{36})/status/:status(REVIEWED|FLAGGED-INCORRECT|REQUIRES-REVIEW)')
  .put((req,res) => {

    let previousStatus = req.reference.status;

    // Check updatability
    if(req.reference.createdBy_id === req.user.id) res.status(400).json({error:{message:'The writer of a reference may not be the reviewer.'}});

    // Write update
    req.reference.status = req.params.status;

    if(req.params.status === 'REVIEWED') req.reference.reviewedBy_id = req.user.id;

    // Send Update to DB
    db.models.kb_reference.update(req.reference.get(), { where: { ident: req.reference.ident, deletedAt: null } }).then(
      (result) => {

        // History Entry
        let createHistory = {
          type: 'status',
          table: db.models.kb_reference.getTableName(),
          model: db.models.kb_reference.name,
          entry: req.reference.ident,
          previous: previousStatus,
          new: req.reference.status,
          user_id: req.user.id,
          comment: req.body.comments
        };

        // Send response
        res.json(req.reference);

        // Create history entry
        db.models.kb_history.create(createHistory);

      },
      (err) => {
        console.log('Unable to update reference status', err);
        res.status(500).json({error: {message: 'Unable to update reference status'}});
      }
    )

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
    'relevance': {operator: "$in", each: null, wrap: false},
    'disease_list': {operator: "$or", each: "$ilike", wrap: true},
    'context': {operator: "$or", each: "$ilike", wrap: true},
    'evidence': {operator: "$in", each: null, wrap: false},
    'status': {operator: "$in", each: null, wrap: false},
    'events_expression': {operator: '$or', each: '$ilike', wrap: true},
    'ref_id': {operator: '$or', each: '$ilike', wrap: true}
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
    searchClause.$or.push({ events_expression: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ relevance: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ context: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ disease_list: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ evidence: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ id_type: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ ref_id: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ id_title: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ status: { $ilike: '%' + query + '%' }});
    searchClause.$or.push({ comments: { $ilike: '%' + query + '%' }});

    where.$and.push(searchClause);
  }

  return where;
};

module.exports = router;