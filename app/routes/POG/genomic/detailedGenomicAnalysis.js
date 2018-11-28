const express = require('express');
const db = require('../../../../app/models');
const reportChangeHistory = require('../../../../app/libs/reportChangeHistory');

const {logger} = process;

const router = express.Router({mergeParams: true});

router.param('alteration', async (req, res, next, altIdent) => {
  try {
    // Look for alteration w/ matching ident
    const alteration = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});

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

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find alteration with ident ${altIdent}: ${returnMessage}`}});
  }
});

router.param('gene', async (req, res, next, altIdent) => {
  try {
    // Look for gene w/ matching ident
    const gene = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});

    if (!gene) throw new Error('notFoundError'); // no gene found

    // gene found, set request param
    req.gene = gene;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - gene could not be found
      returnStatus = 404;
      returnMessage = 'gene could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find alteration with ident ${altIdent}: ${returnMessage}`}});
  }
});

// Handle requests for alterations
router.route('/alterations/:alteration([A-z0-9-]{36})')
  .get((req, res) => res.json(req.alteration))
  .put(async (req, res) => {
    /* TODO: the create, update, and delete code for alterations is repeated in every route that
     * uses them (in this file as well as probe alterations) and should be moved to some kind of
     * alterations module instead of being stored in the routing/middleware
    */
    // specify editable fields
    const editable = ['alterationType', 'newEntry', 'approvedTherapy', 'gene', 'variant',
      'kbVariant', 'disease', 'effect', 'association', 'therapeuticContext', 'status',
      'reference', 'expression_tissue_fc', 'expression_cancer_percentile', 'copyNumber',
      'sample', 'LOHRegion', 'zygosity', 'evidence', 'matched_cancer', 'pmid_ref', 'variant_type',
      'kb_type', 'kb_entry_type', 'kb_event_key', 'kb_entry_key', 'kb_data'];
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

    // Promoting from unknown to another state.
    if (oldAlteration.alterationType === 'unknown' && newAlteration.alterationType !== 'unknown') {
      const newGenomicAltIdentified = {
        pog_report_id: req.report.id,
        pog_id: req.POG.id,
        geneVariant: `${req.alteration.gene} (${req.alteration.variant})`,
      };

      db.models.genomicAlterationsIdentified.scope('public').create(newGenomicAltIdentified);
    }

    try {
      // Update entry
      const update = await db.models.alterations.update(updateAlteration, {where: {ident: oldAlteration.ident}, returning: true});
      const updatedAlt = update[1][0];

      // Record change history for each field updated
      for (const field in updateAlteration) {
        if (updateAlteration[field]) {
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedAlt.ident, 'alterations', field, oldAlteration[field], updateAlteration[field], req.user.id, updatedAlt.pog_report_id, 'alteration', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating alteration with ident ${updatedAlt.ident}.`);
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
      // get alteration record to store in change history
      const deletedAlt = await db.models.alterations.findOne({where: {ident: req.alteration.ident}});
      delete deletedAlt.id;

      // force delete entry
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}, force: true});

      // record change history
      const changeHistorySuccess = await reportChangeHistory.recordDelete(deletedAlt.ident, 'alterations', deletedAlt, req.user.id, deletedAlt.pog_report_id, 'alteration', req.body.comment);

      if (!changeHistorySuccess) {
        logger.error(`Failed to record report change history for deleting alteration with ident ${deletedAlt.ident}.`);
      }

      return res.json({success: true});
    } catch (err) {
      const errMessage = `An error occurred while deleting alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

// Routing for Alteration
router.route('/alterations/:type(therapeutic|biological|prognostic|diagnostic|unknown|novel|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    where.reportType = 'genomic';

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      if (req.params.type.indexOf('Cancer') !== -1) {
        where.approvedTherapy = req.params.type;
      } else {
        where.alterationType = req.params.type;
        where.approvedTherapy = null;
      }
    } else {
      where.approvedTherapy = null;
      where.alterationType = {$notIn: ['unknown', 'novel']};
    }

    const options = {
      where,
      order: 'gene ASC',
    };

    try {
      // Get all rows for this POG
      const alterations = await db.models.alterations.scope('public').findAll(options);
      return res.json(alterations);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'}});
    }
  })

  .post(async (req, res) => {
    // set up record to insert
    const alteration = req.body;
    alteration.pog_id = req.POG.id;
    alteration.pog_report_id = req.report.id;
    alteration.reportType = 'genomic';

    try {
      // create record
      const createdAlt = await db.models.alterations.create(alteration);

      // record create change history
      const changeHistorySuccess = await reportChangeHistory.recordCreate(createdAlt.ident, 'alterations', req.user.id, req.report.id, 'alteration');

      if (!changeHistorySuccess) {
        logger.error(`Failed to record report change history for creation of alteration with ident ${createdAlt.ident}.`);
      }

      // send back created record
      return res.json(createdAlt);
    } catch (err) {
      const errMessage = `An error occurred while creating alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

// Handle requests for targeted genes
/* TODO: these individual get/put/delete routes appear to operate on the alterations table but
 * the general resource (i.e. /targetedGenes) seems to operate on the targeted genes table.
 * Confirm that these shouldn't be writing to the targeted gene table
 * (tests will also need to be updated if so)
*/
router.route('/targetedGenes/:gene([A-z0-9-]{36})')
  .get((req, res) => res.json(req.gene))
  .put(async (req, res) => {
    // specify editable fields
    const editable = ['alterationType', 'newEntry', 'approvedTherapy', 'gene', 'variant',
      'kbVariant', 'disease', 'effect', 'association', 'therapeuticContext', 'status',
      'reference', 'expression_tissue_fc', 'expression_cancer_percentile', 'copyNumber',
      'sample', 'LOHRegion', 'zygosity', 'evidence', 'matched_cancer', 'pmid_ref', 'variant_type',
      'kb_type', 'kb_entry_type', 'kb_event_key', 'kb_entry_key', 'kb_data'];
    const editableErr = [];

    const updateAlteration = {}; // set up object for updating fields
    const oldAlteration = req.gene;
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
      const update = await db.models.alterations.update(updateAlteration, {where: {ident: oldAlteration.ident}, returning: true});
      const updatedAlt = update[1][0];

      // Record change history for each field updated
      for (const field in updateAlteration) {
        if (updateAlteration[field]) {
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedAlt.ident, 'alterations', field, oldAlteration[field], updateAlteration[field], req.user.id, updatedAlt.pog_report_id, 'alteration', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating alteration with ident ${updatedAlt.ident}.`);
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
      // get alteration record to store in change history
      const deletedAlt = await db.models.alterations.findOne({where: {ident: req.gene.ident}});
      delete deletedAlt.id;

      // force delete entry
      await db.models.alterations.destroy({where: {ident: req.gene.ident}, force: true});

      // record change history
      const changeHistorySuccess = await reportChangeHistory.recordDelete(deletedAlt.ident, 'alterations', deletedAlt, req.user.id, deletedAlt.pog_report_id, 'alteration', req.body.comment);

      if (!changeHistorySuccess) {
        logger.error(`Failed to record report change history for deleting alteration with ident ${deletedAlt.ident}.`);
      }

      return res.json({success: true});
    } catch (err) {
      const errMessage = `An error occurred while deleting alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

// Routing for Alteration
router.route('/targetedGenes')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};

    const options = {
      where,
      order: 'gene ASC',
    };

    try {
      // Get all rows for this POG
      const targetedGenes = await db.models.targetedGenes.scope('public').findAll(options);
      return res.json(targetedGenes);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'}});
    }
  });

module.exports = router;
