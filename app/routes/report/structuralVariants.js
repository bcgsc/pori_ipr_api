const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('sv', async (req, res, next, svIdent) => {
  let result;
  try {
    result = await db.models.structuralVariants.scope('public').findOne({where: {ident: svIdent}});
  } catch (error) {
    logger.error(`Unable to get structural variant ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get structural variant'}});
  }

  if (!result) {
    logger.error('Unable to locate structural variant');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate structural variant'}});
  }
  req.variation = result;
  return next();
});

// Handle requests for alterations
router.route('/:sv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.variation);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.structuralVariants.update(req.body, {
        where: {
          ident: req.variation.ident,
        },
        individualHooks: true,
        paranoid: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update structural variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update structural variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.structuralVariants.destroy({where: {ident: req.sv.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove structural variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove structural variant'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const {report: {ident: reportIdent}} = req;

    // Get all structural variants (sv) for this report
    try {
      const results = await db.models.structuralVariants.scope('extended').findAll({
        order: [['gene1Id', 'ASC'], ['gene2Id', 'ASC']],
        include: [
          {
            model: db.models.analysis_report,
            where: {ident: reportIdent},
            attributes: [],
            required: true,
            as: 'report',
          },
          {
            model: db.models.kbMatches,
            attributes: ['ident', 'category'],
          },
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve structural variants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve structural variants'}});
    }
  });


module.exports = router;
