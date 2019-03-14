const express = require('express');
const jwt = require('jsonwebtoken');
const _ = require('lodash');

const router = express.Router({mergeParams: true});

const db = require('../../../app/models');
const ACL = require('../../../app/middleware/acl');
const kbEvent = require('../../../app/libs/kbEvent');
const kbVersion = require('../../../app/libs/kbVersionDatum.js');

router.param('reference', async (req, res, next, ref) => {
  const opts = {};
  opts.attributes = {
    exclude: ['id', 'deletedAt', 'createdBy_id', 'reviewedBy_id'],
  };
  opts.include = [
    {model: db.models.user, as: 'createdBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
  ];
  opts.where = {ident: ref};

  try {
    const reference = await db.models.kb_reference.findOne(opts);

    if (reference === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'}});

    req.reference = reference;
    return next();
  } catch (err) {
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareReferenceQuery'}});
  }
});

/**
 * Build where clause for searching references
 *
 * @param {object} req - Request object
 * @returns {object} - Returns where object ready to be parsed by SequelizeJS ORM
 */
const referenceQueryFilter = (req) => {
  let where = null;

  // Allow filters, and their query settings
  const allowedFilters = {
    type: {operator: '$in', each: null, wrap: false},
    relevance: {operator: '$in', each: null, wrap: false},
    disease_list: {operator: '$or', each: '$ilike', wrap: true},
    context: {operator: '$or', each: '$ilike', wrap: true},
    evidence: {operator: '$in', each: null, wrap: false},
    status: {operator: '$in', each: null, wrap: false},
    events_expression: {operator: '$or', each: '$ilike', wrap: true},
    ref_id: {operator: '$or', each: '$ilike', wrap: true},
  };

  // Are we building a where clause?
  if (_.intersection(_.keysIn(req.query), _.keysIn(allowedFilters)).length > 0) {
    where = {$and: []};

    // Which filters, from the allowed list, have been sent?
    const filters = _.chain(req.query).keysIn().intersection(_.keysIn(allowedFilters)).value();


    // Loop over filters and build them into the ORM clause
    _.forEach(filters, (filter) => {
      // Split the filter values into arrays
      const values = req.query[filter].split(',');

      // Loop over each value and setup the query syntax
      values.forEach((v, i, arr) => {
        if (allowedFilters[filter].each) {
          arr[i] = {}; // Make collection entry
          arr[i][allowedFilters[filter].each] = (allowedFilters[filter].wrap) ? `%${v}%` : v;
        }
      });

      // Build where clause
      const clause = {};
      clause[filter] = {};
      clause[filter][allowedFilters[filter].operator] = values;

      // Add to required (and) clauses
      where.$and.push(clause);
    });
  }

  // Search clause sent?
  if (req.query.search) {
    // Make a search query
    if (where === null) where = {$and: []};

    const query = req.query.search;

    const searchClause = {$or: []};
    searchClause.$or.push({events_expression: {$ilike: `%${query}%`}});
    searchClause.$or.push({relevance: {$ilike: `%${query}%`}});
    searchClause.$or.push({context: {$ilike: `%${query}%`}});
    searchClause.$or.push({disease_list: {$ilike: `%${query}%`}});
    searchClause.$or.push({evidence: {$ilike: `%${query}%`}});
    searchClause.$or.push({id_type: {$ilike: `%${query}%`}});
    searchClause.$or.push({ref_id: {$ilike: `%${query}%`}});
    searchClause.$or.push({id_title: {$ilike: `%${query}%`}});
    searchClause.$or.push({status: {$ilike: `%${query}%`}});
    searchClause.$or.push({comments: {$ilike: `%${query}%`}});

    where.$and.push(searchClause);
  }

  return where;
};


router.route('/')
  .get(async (req, res) => {
    // Access Control
    const access = new ACL(req, res);
    access.nGroups = ['Clinician', 'Collaborator'];
    let externalUser = true;
    if (access.check(true)) externalUser = false;

    // Query Options
    const opts = {};
    opts.limit = (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100;
    opts.offset = (req.query.offset) ? req.query.offset : 0;

    const where = referenceQueryFilter(req);
    if (where !== null) opts.where = where;

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    const filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if (externalUser) {
      if (opts.where) {
        _.each(filterReferenceSources, (refSource) => {
          opts.where.$and.push({ref_id: {$notILike: refSource}});
        });
      } else {
        opts.where = {$and: []};
        _.each(filterReferenceSources, (refSource) => {
          opts.where.$and.push({ref_id: {$notILike: refSource}});
        });
      }
    }

    opts.attributes = {
      exclude: ['deletedAt', 'createdBy_id', 'reviewedBy_id'],
    };
    opts.include = [
      {model: db.models.user, as: 'createdBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ];

    try {
      const references = await db.models.kb_reference.findAll(opts);
      return res.json(references);
    } catch (err) {
      return res.status(500).json({error: {message: `An error occurred while retrieving references from knowledgebase: ${err}`}});
    }
  })
  .post(async (req, res) => {
    const token = jwt.decode(req.header('Authorization'));
    const user = await db.models.user.findOne({where: {username: token.preferred_username}});

    const createReference = req.body;
    createReference.createdBy_id = user.id;
    createReference.status = 'NEW';

    try {
      // Create new references entry
      let newReference = await db.models.kb_reference.create(createReference);
      const createHistory = {
        type: 'create',
        table: db.models.kb_reference.getTableName(),
        model: db.models.kb_reference.name,
        entry: newReference.ident,
        previous: null,
        new: 0,
        user_id: newReference.createdBy_id,
        comment: newReference.comments,
      };

      // Start Event Creation loop
      _.forEach(_.split(newReference.events_expression, /\||&/g), (item) => {
        kbEvent.eventCheck(item, req.user);
      });

      const history = await db.models.kb_history.create(createHistory);

      newReference = newReference.get();
      newReference.history = [history];
      newReference.createdBy = {firstName: user.firstName, lastName: user.lastName, ident: user.ident};

      // Return new object
      res.status(201).json(newReference);
    } catch (err) {
      res.status(500).json({error: {message: `An error occurred while creating the reference to knowledgebase: ${err}`, code: 'failedReferenceCreateQuery'}});
    }
  });

router.route('/count')
  .get(async (req, res) => {
    // Access Control
    const access = new ACL(req, res);
    access.nGroups = ['Clinician', 'Collaborator'];
    let externalUser = true;
    if (access.check(true)) externalUser = false;

    const opts = {};

    const where = referenceQueryFilter(req);
    if (where !== null) opts.where = where;

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    const filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if (externalUser) {
      if (!opts.where) opts.where = {$and: []};

      _.each(filterReferenceSources, (refSource) => {
        opts.where.$and.push({ref_id: {$notILike: refSource}});
      });
    }

    try {
      const count = await db.models.kb_reference.count(opts);
      res.json({references: count});
    } catch (err) {
      res.status(500).json({error: {message: `An error occurred while counting references in knowledgbase: ${err}`}});
    }
  });

router.route('/:reference([A-z0-9-]{36})')
  .put(async (req, res) => {
    const newEntry = req.body;

    // Update Entry
    delete newEntry.id;
    delete newEntry.createdAt;
    delete newEntry.approvedAt;
    newEntry.status = 'REQUIRES-REVIEW';
    newEntry.createdBy_id = req.user.id;
    newEntry.dataVersion = req.reference.dataVersion + 1;

    try {
      const token = jwt.decode(req.header('Authorization'));
      const user = await db.models.user.findOne({where: {username: token.preferred_username}});

      // Version the data
      const version = await kbVersion(db.models.kb_reference, req.reference, newEntry, user, newEntry.comments);

      const reference = version.data.create;

      // Return new object
      return res.status(200).json(reference);
    } catch (err) {
      return res.status(500).json(`An error occurred while retrieving the data version of the reference: ${err}`);
    }
  })
  .get((req, res) => {
    res.json(req.reference);
  });

// Update Route Status
router.route('/:reference([A-z0-9-]{36})/status/:status(REVIEWED|FLAGGED-INCORRECT|REQUIRES-REVIEW)')
  .put(async (req, res) => {
    try {
      const token = jwt.decode(req.header('Authorization'));
      const user = await db.models.user.findOne({where: {username: token.preferred_username}});

      let reference = req.reference;
      const previousStatus = reference.status;
      const comments = req.body.comments;

      if (!_.has(reference, 'createdBy_id')) {
        reference = await db.models.kb_reference.findOne({where: {ident: reference.ident}});
      }

      // Check updatability
      if (reference.createdBy_id === user.id) return res.status(400).json({error: {message: 'The writer of a reference may not be the reviewer.'}});

      // Write update
      reference.status = req.params.status;

      if (req.params.status === 'REVIEWED') reference.reviewedBy_id = user.id;

      await db.models.kb_reference.update(reference.get(), {where: {ident: reference.ident, deletedAt: null}});

      // History Entry
      const createHistory = {
        type: 'status',
        table: db.models.kb_reference.getTableName(),
        model: db.models.kb_reference.name,
        entry: reference.ident,
        previous: previousStatus,
        new: reference.status,
        user_id: user.id,
        comment: comments,
      };

      // Create history entry
      await db.models.kb_history.create(createHistory);

      // Send response
      return res.json(reference);
    } catch (err) {
      return res.status(500).json({error: {message: `An error occurred while updating the reference status: ${err}`}});
    }
  });

module.exports = router;
