const Ajv = require('ajv');
const express = require('express');
const db = require('../../../../models');
const logger = require('../../../../log');

const ajvErrorFormatter = require('../../../../libs/ajvErrorFormatter');
const schemaGenerator = require('../../../../schemas/report/basicReportSchemaGenerator');

const router = express.Router({mergeParams: true});
const ajv = new Ajv({useDefaults: true, coerceTypes: true, logger});

// Middleware for Mutation Summary
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.mutationSummaryv2.scope('public').findAll({where: {report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup mutation summaries for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup the mutation summaries for ${req.POG.POGID}`, code: 'failedMutationSummaryQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find mutation summary for ${req.POG.POGID}`);
    return res.status(404).json({error: {message: `Unable to find mutation summary for ${req.POG.POGID}`, code: 'failedMutationSummaryLookup'}});
  }

  // Found the patient information
  req.mutationSummary = result;
  return next();
});

// Handle requests for mutation summary
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.mutationSummary);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.mutationSummary.update(req.body, {
        where: {
          ident: req.mutationSummary.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update mutation summary ${error}`);
      return res.status(500).json({error: {message: 'Unable to update mutation summary', code: 'failedMutationSummaryVersion'}});
    }
  })
  .post(async (req, res) => {
    // generate mutation summary schema
    const schema = schemaGenerator(db.models.mutationSummaryv2);

    // validate mutation summary data
    const valid = await ajv.validate(schema, req.body);

    if (!valid) {
      ajvErrorFormatter(ajv.errors, logger);
      return res.status(400).json({error: {message: 'The provided mutation summary data is not valid', cause: ajv.errors}});
    }

    // add report id to new entry
    req.body.report_id = req.report.id;

    try {
      const result = await db.models.mutationSummaryv2.create(req.body);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create mutational summary entry ${error}`);
      return res.status(500).json({error: {message: 'Unable to create mutational summary entry'}, cause: error.errors});
    }
  });

module.exports = router;
