const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');

const router = express.Router({mergeParams: true});
const db = require('../../models');
const logger = require('../../log');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.therapeuticTarget, {
  baseUri: REPORT_CREATE_BASE_URI, exclude: [...REPORT_EXCLUDE, 'rank'],
});
const updateSchema = schemaGenerator(db.models.therapeuticTarget, {
  baseUri: REPORT_UPDATE_BASE_URI, exclude: [...REPORT_EXCLUDE, 'rank'], nothingRequired: true,
});

// Middleware for therapeutic targets
router.param('target', async (req, res, next, target) => {
  let result;
  try {
    result = await db.models.therapeuticTarget.findOne({
      where: {ident: target, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to find therapeutic target ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find therapeutic target'}});
  }

  if (!result) {
    logger.error('Unable to locate therapeutic target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate therapeutic target'}});
  }

  // Add therapeutic target to request
  req.target = result;
  return next();
});

// Handle requests for therapeutic target specified by ident
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.target.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    console.log('in put at 50');
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      logger.error(`Error while validating target update request ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while validating target update request ${error}`}});
    }
    console.log('in put at 57');

    if ((req.body.gene || req.body.gene_graphkb_id) && (req.body.signature || req.body.signature_graphkb_id)) {
      const msg = 'Can not set both signature and gene values in therapeutics target table';
      logger.error(msg);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: msg}});
    }
    console.log('in put at 64');

    console.log('target');
    const reqHasGene = (req.body.gene || req.body.gene_graphkb_id);
    const reqHasSignature = (req.body.signature || req.body.signature_graphkb_id);

    try {
      if (reqHasGene) {
        req.body.signature = null;
        req.body.signature_graphkb_id = null;
      } else if (reqHasSignature) {
        req.body.gene = null;
        req.body.gene_graphkb_id = null;
      }
      await req.target.update(req.body, {userId: req.user.id});
      return res.json(req.target.view('public'));
    } catch (error) {
      logger.error(`Unable to update therapeutic target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update therapeutic target'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await req.target.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove therapeutic target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove therapeutic target'}});
    }
  });

// Handle requests for all therapeutic targets for a report
router.route('/')
  .get(async (req, res) => {
    const {report: {id: reportId}} = req;

    // Get all rows for this report
    try {
      const results = await db.models.therapeuticTarget.scope('public').findAll({
        where: {reportId},
        order: [['rank', 'ASC']],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve therapeutic targets ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve therapeutic targets'}});
    }
  })
  .post(async (req, res) => {
    // Create new entry
    console.log('in post at 124');
    const {report: {id: reportId}, body} = req;
    // Validate request against schema
    try {
      validateAgainstSchema(createSchema, body);
    } catch (error) {
      logger.error(`Error while validating target create request ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Error while validating target create request ${error}`}});
    }

    if ((req.body.gene || req.body.gene_graphkb_id) && (req.body.signature || req.body.signature_graphkb_id)) {
      const msg = 'Can not set both signature and gene values in therapeutics target table';
      logger.error(msg);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: msg}});
    }

    try {
      // Note: Paranoid is true for this. So, it finds the max non-deleted entry's rank
      const maxRank = await db.models.therapeuticTarget.max('rank', {where: {reportId}});
      // If no entries NaN is returned, so set rank to 0
      const rank = (Number.isNaN(maxRank)) ? 0 : maxRank + 1;

      const result = await db.models.therapeuticTarget.create({
        ...body,
        rank,
        reportId,
      });
      console.log('made it up to return without error at 152');
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      console.log('in error no wthough');
      logger.error(`Unable to create new therapeutic target entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new therapeutic target entry'}});
    }
  })
  .put(async (req, res) => {
    const {report: {id: reportId}, body} = req;
    try {
      await db.transaction(async (transaction) => {
        return Promise.all(body.map((target) => {
          return db.models.therapeuticTarget.update(
            {rank: target.rank},
            {
              where: {
                reportId,
                ident: target.ident,
              },
              transaction,
              hooks: false,
            },
          );
        }));
      });

      return res.json({updated: true});
    } catch (error) {
      logger.error(`Unable to update therapeutic target rank ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to update therapeutic target rank'}});
    }
  });

module.exports = router;
