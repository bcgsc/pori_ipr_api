const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

router.param('cnv', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.copyVariants.findOne({
      where: {ident: mutIdent},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Error while processing request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource'}});
  }

  // Add cnv to request
  req.cnv = result;
  return next();
});

// Handle requests for copy variant
router.route('/:cnv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.cnv.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.cnv.update(req.body);
      await req.cnv.reload();
      return res.json(req.cnv.view('public'));
    } catch (error) {
      logger.error(`Unable to version copy variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to version copy variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.cnv.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove copy variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove copy variant'}});
    }
  });

// Routing for report copy variants
router.route('/')
  .get(async (req, res) => {
    const {report: {ident: reportIdent}} = req;
    // Get all cnv's for this report
    try {
      const result = await db.models.copyVariants.scope('extended').findAll({
        order: [['geneId', 'ASC']],
        where: {
          cnvState: {[Op.ne]: null},
        },
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
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource'}});
    }
  });


module.exports = router;
