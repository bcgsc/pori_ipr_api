const express = require('express');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const logger = require('../../../lib/log');

const db = require('../../models');
const ACL = require('../../middleware/acl');
const kbEvent = require('../../libs/kbEvent');
const kbVersion = require('../../libs/kbVersionDatum.js');

router.param('reference', async (req, res, next, ref) => {
  const opts = {
    attributes: {
      exclude: ['id', 'deletedAt', 'createdBy_id', 'reviewedBy_id'],
    },
    include: [
      {model: db.models.user, as: 'createdBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ],
    where: {
      ident: ref,
    },
  };

  try {
    const reference = await db.models.kb_reference.findOne(opts);

    if (!reference) {
      return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'}});
    }

    req.reference = reference;
    return next();
  } catch (error) {
    logger.error(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareReferenceQuery'}});
  }
});

/**
 * Build where clause for searching references
 *
 * @param {object} req - Request object
 *
 * @returns {object} - Returns where object ready to be parsed by SequelizeJS ORM
 */
const referenceQueryFilter = (req) => {
  let where = null;
  const clauses = [];

  // Allow filters, and their query settings
  const allowedFilters = {
    type: {operator: [Op.in], each: null, wrap: false},
    relevance: {operator: [Op.in], each: null, wrap: false},
    disease_list: {operator: [Op.or], each: [Op.iLike], wrap: true},
    context: {operator: [Op.or], each: [Op.iLike], wrap: true},
    evidence: {operator: [Op.in], each: null, wrap: false},
    status: {operator: [Op.in], each: null, wrap: false},
    events_expression: {operator: [Op.or], each: [Op.iLike], wrap: true},
    ref_id: {operator: [Op.or], each: [Op.iLike], wrap: true},
    ident: {operator: [Op.or], each: null, wrap: false},
  };

  // Are we building a where clause?
  if (_.intersection(Object.keys(req.query), Object.keys(allowedFilters)).length > 0) {
    // Which filters, from the allowed list, have been sent?
    const filters = _.chain(req.query).keysIn().intersection(_.keysIn(allowedFilters)).value();


    // Loop over filters and build them into the ORM clause
    filters.forEach((filter) => {
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
      clauses.push(clause);
    });
  }

  // Search clause sent?
  if (req.query.search) {
    const query = req.query.search;

    const searchClause = {
      [Op.or]: [
        {events_expression: {[Op.iLike]: `%${query}%`}},
        {relevance: {[Op.iLike]: `%${query}%`}},
        {context: {[Op.iLike]: `%${query}%`}},
        {disease_list: {[Op.iLike]: `%${query}%`}},
        {evidence: {[Op.iLike]: `%${query}%`}},
        {id_type: {[Op.iLike]: `%${query}%`}},
        {ref_id: {[Op.iLike]: `%${query}%`}},
        {id_title: {[Op.iLike]: `%${query}%`}},
        {status: {[Op.iLike]: `%${query}%`}},
        {comments: {[Op.iLike]: `%${query}%`}},
      ],
    };

    clauses.push(searchClause);
  }

  where = {[Op.and]: clauses};
  return where;
};


router.route('/')
  .get(async (req, res) => {
    // Access Control
    const access = new ACL(req, res);
    access.nGroups = ['Clinician', 'Collaborator'];
    let externalUser = true;
    if (access.check(true)) {
      externalUser = false;
    }

    // Query Options
    const opts = {
      limit: (req.query.limit && req.query.limit < 1001) ? req.query.limit : 100,
      offset: (req.query.offset) ? req.query.offset : 0,
      attributes: {
        exclude: ['deletedAt', 'createdBy_id', 'reviewedBy_id'],
      },
      include: [
        {model: db.models.user, as: 'createdBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
        {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      ],
    };

    const where = referenceQueryFilter(req);
    if (where) {
      opts.where = where;
    }

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    const filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if (externalUser) {
      if (!opts.where) {
        opts.where = {[Op.and]: []};
      }
      const sources = filterReferenceSources.map((refSource) => {
        return {ref_id: {[Op.notILike]: refSource}};
      });

      opts.where[Op.and].concat(sources);
    }

    try {
      const references = await db.models.kb_reference.findAll(opts);
      return res.json(references);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: `An error occurred while retrieving references from knowledgebase: ${error}`}});
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
      newReference.events_expression.split(/\||&/g).forEach((item) => {
        kbEvent.eventCheck(item, req.user);
      });

      const history = await db.models.kb_history.create(createHistory);

      newReference = newReference.get();
      newReference.history = [history];
      newReference.createdBy = {firstName: user.firstName, lastName: user.lastName, ident: user.ident};

      // Return new object
      return res.status(201).json(newReference);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: `An error occurred while creating the reference to knowledgebase: ${error}`, code: 'failedReferenceCreateQuery'}});
    }
  });

router.route('/count')
  .get(async (req, res) => {
    // Access Control
    const access = new ACL(req, res);
    access.nGroups = ['Clinician', 'Collaborator'];
    let externalUser = true;
    if (access.check(true)) {
      externalUser = false;
    }

    const opts = {};

    const where = referenceQueryFilter(req);
    if (where) {
      opts.where = where;
    }

    // filter references by source (ref_id) if being accessed by external user
    // TODO: to be replaced by another filtering mechanism in the future since this doesn't account for new sources that cannot be shared
    const filterReferenceSources = ['%archerdx%', '%quiver.archer%', '%foundationone%', '%clearityfoundation%', '%mycancergenome%', '%thermofisher%', 'IBM', '%pct.mdanderson%', '%nccn%'];

    if (externalUser) {
      if (!opts.where) {
        opts.where = {[Op.and]: []};
      }
      const sources = filterReferenceSources.map((refSource) => {
        return {ref_id: {[Op.notILike]: refSource}};
      });

      opts.where[Op.and].concat(sources);
    }

    try {
      const count = await db.models.kb_reference.count(opts);
      return res.json({references: count});
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: `An error occurred while counting references in knowledgbase: ${error}`}});
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
    } catch (error) {
      logger.error(error);
      return res.status(500).json(`An error occurred while retrieving the data version of the reference: ${error}`);
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

      let {reference} = req;
      const previousStatus = reference.status;
      const {comments} = req.body;

      if (!_.has(reference, 'createdBy_id')) {
        reference = await db.models.kb_reference.findOne({where: {ident: reference.ident}});
      }

      // Check updatability
      if (reference.createdBy_id === user.id) {
        return res.status(400).json({error: {message: 'The writer of a reference may not be the reviewer.'}});
      }

      // Write update
      reference.status = req.params.status;

      if (req.params.status === 'REVIEWED') {
        reference.reviewedBy_id = user.id;
      }

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
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: `An error occurred while updating the reference status: ${error}`}});
    }
  });

module.exports = router;
