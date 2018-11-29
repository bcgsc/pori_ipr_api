const express = require('express');
const _ = require('lodash');
const db = require('../../../../../app/models');
const reportChangeHistory = require('../../../../../app/libs/reportChangeHistory');

const {logger} = process;
const router = express.Router({mergeParams: true});

router.param('alteration', async (req, res, next, altIdent) => {
  try {
    // Look for alteration w/ matching ident
    const alteration = await db.models.genomicAlterationsIdentified.scope('public').findOne({where: {ident: altIdent}});

    if (!alteration) throw new Error('notFoundError'); // no alteration found

    // alteration found, set request param
    req.alteration = alteration;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - alteration could not be found
      returnStatus = 404;
      returnMessage = 'alteration could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find genomic alteration identified with ident ${altIdent}: ${returnMessage}`}});
  }
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req, res) => res.json(req.alteration))
  .put(async (req, res) => {
    // specify editable fields
    const editable = ['geneVariant'];
    const editableErr = [];

    const updateAlteration = {}; // set up object for updating fields
    const oldAlteration = req.alteration;
    const newAlteration = req.body;

    for (const field in newAlteration) {
      if (newAlteration[field]) {
        const fieldValue = newAlteration[field];
        if (fieldValue !== oldAlteration[field] && field !== 'comment') {
          if (!editable.includes(field)) editableErr.push(field); // check if user is editing a non-editable field
          updateAlteration[field] = fieldValue;
        }
      }
    }

    if (editableErr.length > 0) return res.status(400).json({error: {message: `The following alteration fields are not editable: ${editableErr.join(', ')}`}});

    try {
      // Update entry
      const update = await db.models.genomicAlterationsIdentified.update(updateAlteration, {where: {ident: oldAlteration.ident}, returning: true});
      const updatedAlt = update[1][0];

      // Record change history for each field updated
      for (const field in updateAlteration) {
        if (updateAlteration[field]) {
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedAlt.ident, 'genomicAlterationsIdentified', field, oldAlteration[field], updateAlteration[field], req.user.id, updatedAlt.pog_report_id, 'alteration', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating genomic alteration identified with ident ${updatedAlt.ident}.`);
          }
        }
      }

      return res.json(updatedAlt);
    } catch (err) {
      const errMessage = `An error occurred while updating alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  })
  .delete(async (req, res) => {
    try {
      await db.models.genomicAlterationsIdentified.destroy({where: {ident: req.alteration.ident}, force: true});
      const deletedContent = req.alteration;
      delete deletedContent.id;

      const changeHistorySuccess = await reportChangeHistory.recordDelete(deletedContent.ident, 'genomicAlterationsIdentified', deletedContent, req.user.id, req.report.id, 'genomic alterations identified', req.body.comment);

      if (!changeHistorySuccess) logger.error(`Failed to record report change history for deleting genomic alteration identified with ident ${deletedContent.ident}.`);

      // Check if we should destroy associated entries
      if (req.query.cascade && req.query.cascade === 'true') {
        const gene = _.split(req.alteration.geneVariant, (/\s(.+)/));
        const opts = {where: {gene: gene[0], variant: gene[1].replace(/(\(|\))/g, ''), pog_report_id: req.report.id}};

        // get associated genomic events therapeutic to record delete change history for
        const genomicEventsTherapeutic = await db.models.genomicEventsTherapeutic.findAll({where: {genomicEvent: req.alteration.geneVariant, pog_report_id: req.report.id}});
        if (genomicEventsTherapeutic.length > 0) {
          // destroy associated events
          await db.models.genomicEventsTherapeutic.destroy({where: {genomicEvent: req.alteration.geneVariant, pog_report_id: req.report.id}, force: true});
          // record change history
          genomicEventsTherapeutic.forEach(async (event) => {
            delete event.id;
            const eventChangeHistorySuccess = await reportChangeHistory.recordDelete(event.ident, 'genomicEventsTherapeutic', event, req.user.id, req.report.id, 'genomic events therapeutic', req.body.comment);
            if (!eventChangeHistorySuccess) logger.error(`Failed to record report change history for deleting therapeutic genomic event with ident ${event.ident}.`);
          });
        }

        // get associated alterations to record delete change history for
        const associatedAlts = await db.models.alterations.findAll(opts);
        if (associatedAlts.length > 0) {
          // Cascade removal of variant through Detailed Genomic Analysis
          opts.force = true; // force delete to override paranoid mode
          await db.models.alterations.destroy(opts);
          // record change history
          associatedAlts.forEach(async (alt) => {
            delete alt.id;
            const altChangeHistorySuccess = await reportChangeHistory.recordDelete(alt.ident, 'alterations', alt, req.user.id, req.report.id, 'alterations', req.body.comment);
            if (!altChangeHistorySuccess) logger.error(`Failed to record report change history for deleting alteration with ident ${alt.ident}.`);
          });
        }
      }
      return res.json({success: true});
    } catch (err) {
      const errMessage = `An error occurred while deleting alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        pog_report_id: req.report.id,
      },
    };
    try {
      const alterations = await db.models.genomicAlterationsIdentified.scope('public').findAll(options);
      return res.json(alterations);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicAlterationsIdentifiedQuery'}});
    }
  })
  .post(async (req, res) => {
    const alteration = req.body;
    alteration.pog_report_id = req.report.id;
    alteration.pog_id = req.report.pog_id;
    try {
      // create new alteration
      const newAlt = await db.models.genomicAlterationsIdentified.create(alteration);
      // record change history
      const changeHistorySuccess = await reportChangeHistory.recordCreate(newAlt.ident, 'genomicAlterationsIdentified', req.user.id, req.report.id, 'genomic alterations identified');
      if (!changeHistorySuccess) logger.error(`Failed to record report change history for creating genomic alteration identified with ident ${newAlt.ident}.`);
      return res.json(newAlt);
    } catch (err) {
      const errMessage = `An error occurred while creating alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

module.exports = router;
