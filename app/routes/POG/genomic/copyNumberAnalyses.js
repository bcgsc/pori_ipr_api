const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../../lib/log');

router.param('cnv', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.cnv.scope('public').findOne({where: {ident: mutIdent}});
  } catch (error) {
    logger.error(`Error while processing request ${error}`);
    return res.status(500).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareCNVQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(404).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareCNVLookup'}});
  }

  req.cnv = result;
  return next();
});

// Handle requests for alterations
router.route('/cnv/:cnv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.cnv);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.cnv.update(req.body, {
        where: {
          ident: req.cnv.ident,
        },
        paranoid: true,
        returning: true,
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to version the resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.cnv.destroy({where: {ident: req.cnv.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedCNVremove'}});
    }
  });

// Routing for Alteration
router.route('/cnv/:type(clinical|nostic|biological|commonAmplified|homodTumourSupress|highlyExpOncoGain|lowlyExpTSloss)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      where.cnvVariant = req.params.type;
    }

    const options = {
      where,
    };

    // Get all rows for this POG
    try {
      const result = await db.models.cnv.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedCNVlookup'}});
    }
  });


module.exports = router;
