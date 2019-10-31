const express = require('express');
const _ = require('lodash');
const {Op} = require('sequelize');
const db = require('../../models');
const kbVersion = require('../../libs/kbVersionDatum.js');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

/**
 * Build where clause for searching events
 *
 * @param {object} req - Request object
 *
 * @returns {object} - Returns where object ready to be parsed by SequelizeJS ORM
 */
const eventQueryFilter = (req) => {
  let where = null;
  const clauses = [];

  // Allow filters, and their query settings
  const allowedFilters = {
    key: {operator: [Op.or], each: [Op.iLike], wrap: true},
    type: {operator: [Op.in], each: null, wrap: false},
    name: {operator: [Op.or], each: [Op.iLike], wrap: true},
    display_coord: {operator: [Op.or], each: [Op.iLike], wrap: true},
    notation: {operator: [Op.or], each: [Op.iLike], wrap: true},
    related_events: {operator: [Op.or], each: [Op.iLike], wrap: true},
    subtype: {operator: [Op.in], each: null, wrap: false},
    description: {operator: [Op.or], each: [Op.iLike], wrap: true},
    status: {operator: [Op.or], each: [Op.iLike], wrap: true},
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
        {key: {[Op.iLike]: `%${query}%`}},
        {name: {[Op.iLike]: `%${query}%`}},
        {display_coord: {[Op.iLike]: `%${query}%`}},
        {notation: {[Op.iLike]: `%${query}%`}},
        {related_events: {[Op.iLike]: `%${query}%`}},
        {subtype: {[Op.iLike]: `%${query}%`}},
        {description: {[Op.iLike]: `%${query}%`}},
        {status: {[Op.iLike]: `%${query}%`}},
        {comments: {[Op.iLike]: `%${query}%`}},
      ],
    };

    clauses.push(searchClause);
  }

  where = {[Op.and]: clauses};
  return where;
};

router.param('event', async (req, res, next, event) => {
  const opts = {
    attributes: {
      exclude: ['id', 'deletedAt', 'createdBy_id', 'reviewedBy_id'],
    },
    include: [
      {model: db.models.user, as: 'createdBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
      {model: db.models.user, as: 'reviewedBy', attributes: {exclude: ['id', 'password', 'jiraToken', 'jiraXsrf', 'access', 'settings', 'deletedAt', 'updatedAt', 'createdAt']}},
    ],
    where: {
      ident: event,
    },
  };

  try {
    const result = await db.models.kb_event.findOne(opts);

    if (!result) {
      return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareKBEventLookup'}});
    }
    req.event = result;
    return next();
  } catch (error) {
    logger.error(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareKBEventQuery'}});
  }
});

router.route('/')
  .get(async (req, res) => {
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

    const where = eventQueryFilter(req);
    if (where) {
      opts.where = where;
    }

    try {
      const results = await db.models.kb_event.findAll(opts);
      return res.json(results);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'An internal error prevented the API from returning the results. Please try again. If it continues to fail please contact us.'}});
    }
  })
  .post(async (req, res) => {
    // Add new event
    // Validation!!
    req.body.createdBy_id = req.user.id;
    req.body.status = 'NEW';

    let event = null;
    try {
      // Create new events entry
      event = await db.models.kb_event.create(req.body);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to create the new events entry', code: 'failedEventCreateQuery'}});
    }

    // History Entry
    const createHistory = {
      type: 'create',
      table: db.models.kb_event.getTableName(),
      model: db.models.kb_event.name,
      entry: event.ident,
      previous: null,
      new: 0,
      user_id: req.user.id,
      comment: req.body.comments,
    };

    try {
      // Create history entry
      const history = await db.models.kb_history.create(createHistory);

      // Construct response object
      event = event.get();
      event.history = [history];
      event.createdBy = {firstName: req.user.firstName, lastName: req.user.lastName, ident: req.user.ident};

      return res.status(201).json(event);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to create the new events history entry', code: 'failedHistoryCreateQuery'}});
    }
  });

router.route('/count')
  // Get count of events
  .get(async (req, res) => {
    const opts = {};

    const where = eventQueryFilter(req);
    if (where) {
      opts.where = where;
    }

    try {
      const result = await db.models.kb_event.count(opts);
      return res.json({events: result});
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to get the number of events'}});
    }
  });

router.route('/:event([A-z0-9-]{36})')
  // Get event
  .get((req, res) => {
    res.json(req.event);
  })
  // Update event
  .put(async (req, res) => {
    // Update Entry
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.approvedAt;

    req.body.status = 'REQUIRES-REVIEW';
    req.body.createdBy_id = req.user.id;
    req.body.dataVersion = req.event.dataVersion + 1;

    try {
      // Version the data
      const result = await kbVersion(db.models.kb_event, req.event, req.body, req.user, req.body.comments);
      const event = result.data.create.get();
      const {history} = result.data;
      event.history = [history];
      return res.status(200).json(event);
    } catch (error) {
      logger.error(error);
      return res.status(500).json('Unable to version the data');
    }
  });

module.exports = router;
