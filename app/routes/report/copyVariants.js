const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('cnv', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.copyVariants.scope('public').findOne({where: {ident: mutIdent}});
  } catch (error) {
    logger.error(`Error while processing request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareCNVQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareCNVLookup'}});
  }

  req.cnv = result;
  return next();
});

// Handle requests for alterations
router.route('/:cnv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.cnv);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.copyVariants.update(req.body, {
        where: {
          ident: req.cnv.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to version the resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to version the resource', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.copyVariants.destroy({where: {ident: req.copyVariants.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove resource', code: 'failedCNVremove'}});
    }
  });

// Routing for Alteration
router.route('/:type(clinical|nostic|biological|commonAmplified|homodTumourSupress|highlyExpOncoGain|lowlyExpTSloss)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      where.cnvVariant = req.params.type;
    }

    const options = {
      where,
    };

    // Get all cnv's for this report
    try {
      const result = await db.models.copyVariants.scope('extended').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource', code: 'failedCNVlookup'}});
    }
  });


module.exports = router;
